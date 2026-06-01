import { eq, desc } from "drizzle-orm";
import { createDb } from "../db";
import type { Database } from "../db";
import { agentDecisions, aiAgents, tradingSessions, sessionLogs } from "../db/schema";
import { getPortfolio, getMarketOverview, snapshotNetWorth } from "../tools/trading";
import { resolveAdapter, applyActions } from "../services/agents";
import type { AgentContext } from "../services/agents";
import { retrieveMemory, recordReflection } from "../services/agents/memory";
import type { RetrievedMemory } from "../services/agents/memory";
import { getPersona } from "../services/agents/personas";
import { enforceRiskConstraints } from "../services/agents/risk";
import { applySessionRatings } from "../services/scoring";
import { getLastSessionOrderFlow } from "../services/order-flow";
import type { OrderFlow } from "../services/order-flow";
import type { Env } from "../services/llm/types";
import { RateLimitError, ProviderError } from "../services/llm/types";
import { refreshAssetPrices, getRecentPriceHistory } from "./market-data";
import type { RefreshResult } from "./market-data";

interface AgentSessionResult {
  agentId: string;
  agentName: string;
  status: "success" | "skipped" | "failed";
  failureReason?: string;
  decisionType: "trade" | "hold" | "error";
  assistantText: string | null;
  trades: number;
  tradeDetails: Array<{
    action: string;
    asset: string;
    quantity: number;
    reasoning: string;
    success: boolean;
    error?: string;
  }>;
  providerUsed: string;
  modelUsed: string;
  latencyMs: number;
  tokensUsed?: number;
  confidence: number | null;
}

interface SessionRunResult {
  sessionId: string;
  sessionNumber: number;
  priceRefresh: RefreshResult;
  results: AgentSessionResult[];
  totalTrades: number;
  successfulAgents: number;
  failedAgents: number;
}

function buildAgentContext(
  agent: typeof aiAgents.$inferSelect,
  sessionId: string,
  sessionNumber: number,
  portfolio: Awaited<ReturnType<typeof getPortfolio>>,
  market: Awaited<ReturnType<typeof getMarketOverview>>,
  priceHistory: Awaited<ReturnType<typeof getRecentPriceHistory>>,
  orderFlow: OrderFlow | undefined,
  memory?: RetrievedMemory,
): AgentContext {
  const persona = getPersona(agent.strategyPersona);
  return {
    agentId: agent.id,
    agentName: agent.agentName,
    sessionId,
    sessionNumber,
    portfolio: {
      cashBalance: portfolio.cashBalance,
      portfolioValue: portfolio.portfolioValue,
      netWorth: portfolio.netWorth,
      holdings: portfolio.holdings,
    },
    market: market.map((a) => ({
      symbol: a.symbol,
      name: a.name,
      currentPrice: a.currentPrice,
      assetType: a.assetType,
    })),
    priceHistory,
    orderFlow,
    memory,
    persona: persona
      ? {
          id: persona.id,
          name: persona.name,
          promptAddendum: persona.promptAddendum,
          riskConstraints: persona.riskConstraints,
        }
      : undefined,
  };
}

async function runAgentSession(
  db: Database,
  env: Env,
  agent: typeof aiAgents.$inferSelect,
  sessionId: string,
  sessionNumber: number,
  market: Awaited<ReturnType<typeof getMarketOverview>>,
  priceHistory: Awaited<ReturnType<typeof getRecentPriceHistory>>,
  orderFlow: OrderFlow | undefined,
): Promise<AgentSessionResult> {
  const startTime = Date.now();

  const result: AgentSessionResult = {
    agentId: agent.id,
    agentName: agent.agentName,
    status: "success",
    decisionType: "hold",
    assistantText: null,
    trades: 0,
    tradeDetails: [],
    providerUsed: agent.provider,
    modelUsed: agent.model,
    latencyMs: 0,
    confidence: null,
  };

  try {
    const portfolio = await getPortfolio(db, agent.id, agent);
    const memory = agent.memoryEnabled ? await retrieveMemory(db, agent.id) : undefined;
    const context = buildAgentContext(
      agent,
      sessionId,
      sessionNumber,
      portfolio,
      market,
      priceHistory,
      orderFlow,
      memory,
    );

    const adapter = resolveAdapter(env, agent);
    const decision = await adapter.decide(context);

    result.providerUsed = decision.providerUsed;
    result.modelUsed = decision.modelUsed;
    result.tokensUsed = decision.tokensUsed;
    result.assistantText = decision.reasoning;

    const confidences = decision.actions
      .map((a) => a.confidence)
      .filter((c): c is number => typeof c === "number");
    result.confidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : null;

    let tradeActions = decision.actions.filter((a) => a.type !== "hold");
    if (context.persona?.riskConstraints && tradeActions.length > 0) {
      const enforced = enforceRiskConstraints(
        tradeActions,
        context,
        context.persona.riskConstraints,
      );
      tradeActions = enforced.actions.filter((a) => a.type !== "hold");
      if (enforced.rejections.length > 0) {
        console.log(
          `[trading-session] agent=${agent.id} persona=${context.persona.id} risk_rejected=${enforced.rejections.length}`,
        );
      }
    }
    if (tradeActions.length > 0) {
      const applied = await applyActions(db, agent.id, sessionId, tradeActions);
      result.trades = applied.filter((r) => r.success).length;
      result.tradeDetails = applied;
      result.decisionType = result.trades > 0 ? "trade" : "hold";
    } else {
      result.decisionType = "hold";
    }

    await snapshotNetWorth(db, agent.id, sessionId);

    if (agent.memoryEnabled) {
      await recordReflection(db, env, agent.id, sessionId, sessionNumber, {
        decisionType: result.decisionType,
        reasoning: result.assistantText,
        trades: result.tradeDetails
          .filter((t) => t.success)
          .map((t) => ({ action: t.action, asset: t.asset, quantity: t.quantity })),
      });
    }
  } catch (err) {
    result.decisionType = "error";
    if (err instanceof RateLimitError) {
      result.status = "skipped";
      result.failureReason = "rate_limited";
      console.warn(
        `[trading-session] rate_limited agent=${agent.id} provider=${agent.provider} model=${agent.model} session=${sessionId} retryAfter=${err.retryAfter ?? "n/a"}`,
      );
    } else if (err instanceof ProviderError) {
      result.status = "failed";
      result.failureReason = `provider_error_${err.statusCode}`;
      console.error(
        `[trading-session] provider_error agent=${agent.id} provider=${agent.provider} model=${agent.model} session=${sessionId} status=${err.statusCode}`,
      );
    } else {
      result.status = "failed";
      result.failureReason = err instanceof Error ? err.message : "unknown_error";
      console.error(
        `[trading-session] unknown_error agent=${agent.id} provider=${agent.provider} model=${agent.model} session=${sessionId} message=${result.failureReason}`,
      );
    }
  }

  result.latencyMs = Date.now() - startTime;

  await db.insert(agentDecisions).values({
    id: crypto.randomUUID(),
    sessionId,
    agentId: agent.id,
    decisionType: result.decisionType,
    reasoning: result.assistantText,
    confidence: result.confidence,
  });

  await db.insert(sessionLogs).values({
    id: crypto.randomUUID(),
    sessionId,
    agentId: agent.id,
    providerUsed: result.providerUsed,
    modelUsed: result.modelUsed,
    status: result.status,
    failureReason: result.failureReason ?? null,
    toolCallsMade: result.trades,
    tokensUsed: result.tokensUsed ?? null,
    latencyMs: result.latencyMs,
  });

  return result;
}

export async function runTradingSession(env: Env): Promise<SessionRunResult> {
  const db = createDb(env.DB);

  const priceRefresh = await refreshAssetPrices(env, db);

  const lastSession = await db.query.tradingSessions.findFirst({
    orderBy: desc(tradingSessions.sessionNumber),
  });
  const nextNumber = lastSession ? lastSession.sessionNumber + 1 : 1;

  const sessionId = crypto.randomUUID();
  await db.insert(tradingSessions).values({
    id: sessionId,
    sessionNumber: nextNumber,
    status: "running",
  });

  const agents = await db.query.aiAgents.findMany();

  const market = await getMarketOverview(db);
  const priceHistory = await getRecentPriceHistory(
    db,
    market.map((a) => a.symbol),
    30,
  );
  const orderFlow = await getLastSessionOrderFlow(db, sessionId);

  const byProvider = new Map<string, typeof agents>();
  for (const agent of agents) {
    const list = byProvider.get(agent.provider) ?? [];
    list.push(agent);
    byProvider.set(agent.provider, list);
  }

  console.log(
    `[trading-session] session=${sessionId} number=${nextNumber} agents=${agents.length} providerGroups=${byProvider.size}`,
  );

  const groupResults = await Promise.all(
    Array.from(byProvider.entries()).map(async ([provider, providerAgents]) => {
      const groupStart = Date.now();
      const out: AgentSessionResult[] = [];
      for (const agent of providerAgents) {
        out.push(
          await runAgentSession(
            db,
            env,
            agent,
            sessionId,
            nextNumber,
            market,
            priceHistory,
            orderFlow,
          ),
        );
      }
      const skipped = out.filter((r) => r.failureReason === "rate_limited").length;
      if (skipped > 0) {
        console.warn(
          `[trading-session] provider=${provider} skipped=${skipped}/${providerAgents.length} due to rate limits in session=${sessionId}`,
        );
      }
      console.log(
        `[trading-session] provider=${provider} done agents=${providerAgents.length} ms=${Date.now() - groupStart}`,
      );
      return out;
    }),
  );

  const results: AgentSessionResult[] = groupResults.flat();

  try {
    const participantIds = results.filter((r) => r.status === "success").map((r) => r.agentId);
    await applySessionRatings(db, sessionId, participantIds);
  } catch (err) {
    console.error(
      `[trading-session] rating update failed session=${sessionId} reason=${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  await db
    .update(tradingSessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(tradingSessions.id, sessionId));

  return {
    sessionId,
    sessionNumber: nextNumber,
    priceRefresh,
    results,
    totalTrades: results.reduce((sum, r) => sum + r.trades, 0),
    successfulAgents: results.filter((r) => r.status === "success").length,
    failedAgents: results.filter((r) => r.status !== "success").length,
  };
}
