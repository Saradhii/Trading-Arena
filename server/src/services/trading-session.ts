import { eq, desc } from "drizzle-orm";
import { createDb } from "../db";
import type { Database } from "../db";
import { agentDecisions, aiAgents, tradingSessions, sessionLogs } from "../db/schema";
import { getPortfolio, getMarketOverview, snapshotNetWorth } from "../tools/trading";
import { chatWithTools } from "../services/llm";
import { tradingTools } from "../services/llm/tools";
import { executeToolCalls } from "../services/llm/executor";
import type { LLMMessage, Env } from "../services/llm/types";
import { RateLimitError, ProviderError } from "../services/llm/types";
import { refreshAssetPrices } from "./market-data";
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

function buildSystemPrompt(
  agentName: string,
  portfolio: {
    cashBalance: number;
    portfolioValue: number;
    netWorth: number;
    holdings: Array<{
      symbol: string;
      name: string;
      quantity: number;
      averageBuyPrice: number;
      currentPrice: number;
      currentValue: number;
      pnl: number;
    }>;
  },
  market: Array<{
    symbol: string;
    name: string;
    currentPrice: number;
    assetType: string;
  }>,
): string {
  const holdingsStr =
    portfolio.holdings.length > 0
      ? portfolio.holdings
          .map(
            (h) =>
              `- ${h.symbol}: ${h.quantity} units @ avg $${h.averageBuyPrice.toFixed(2)} | current $${h.currentPrice.toFixed(2)} | P&L: $${h.pnl.toFixed(2)}`,
          )
          .join("\n")
      : "No holdings";

  const marketStr = market
    .map(
      (a) =>
        `- ${a.symbol} (${a.name}) [${a.assetType}]: $${a.currentPrice.toFixed(2)}`,
    )
    .join("\n");

  return `You are ${agentName}, a hedge fund portfolio manager. You manage capital across crypto and equities markets. Your role is to allocate capital where you see asymmetric risk-adjusted return — and just as importantly, to refrain when the data does not support a thesis.

## Your Portfolio
- Cash: $${portfolio.cashBalance.toFixed(2)}
- Portfolio Value: $${portfolio.portfolioValue.toFixed(2)}
- Net Worth: $${portfolio.netWorth.toFixed(2)}

### Current Holdings
${holdingsStr}

## Available Market
${marketStr}

## Available Actions
- market_buy(assetSymbol, quantity, reasoning) — open or grow a position
- market_sell(assetSymbol, quantity, reasoning) — close or reduce a position
- Hold by taking no action — no tool call means no trade this session

## Your discipline
- Holding is a legitimate, often correct decision. Strong managers protect capital when no clear edge exists; they do not force trades.
- Trade only when your analysis identifies a clear thesis that justifies the risk and position size.
- You may make up to 2 trades this session, or zero if you see no edge.
- When you trade, your reasoning should reflect actual market analysis — your read on the asset, the position, and why now — not generic risk-management filler.

## Required output (read carefully)
You MUST always return a text message (2–4 sentences) describing your market read and the decision you are taking this session. This is non-negotiable — the text is your audit trail and is reviewed weeks later to evaluate your judgment.

- **If you hold:** return only the text message, no tool calls. The text must explain *why* you are holding.
- **If you trade:** in the SAME response, return BOTH the text message AND the market_buy / market_sell tool call(s). The assistant message must contain a non-empty content field with your thesis (what you see, why now, what the trade expresses) in addition to the tool_calls field. An empty/null content with tool calls is a malformed response.

Even when you call tools, write your prose first, then issue the tool calls.`;
}

async function runAgentSession(
  db: Database,
  env: Env,
  agent: typeof aiAgents.$inferSelect,
  sessionId: string,
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
  };

  try {
    const portfolio = await getPortfolio(db, agent.id);
    const market = await getMarketOverview(db);

    const systemPrompt = buildSystemPrompt(agent.agentName, portfolio, market);

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Review the portfolio and market. Always include a short text rationale describing your decision (trade or hold). Trade only if you see a thesis that justifies the risk; otherwise hold." },
    ];

    const response = await chatWithTools(env, agent.id, messages, tradingTools);

    result.providerUsed = response.providerUsed;
    result.modelUsed = response.modelUsed;
    result.tokensUsed = response.tokensUsed;
    result.assistantText = response.content ?? null;

    if (response.toolCalls && response.toolCalls.length > 0) {
      const execResults = await executeToolCalls(
        db,
        response.toolCalls,
        agent.id,
        sessionId,
      );

      result.trades = execResults.filter((r) => r.success).length;
      result.tradeDetails = execResults.map((r) => ({
        action: r.functionName,
        asset: (r.args?.assetSymbol as string) ?? "",
        quantity: (r.args?.quantity as number) ?? 0,
        reasoning: (r.args?.reasoning as string) ?? "",
        success: r.success,
        error: r.error,
      }));
      result.decisionType = result.trades > 0 ? "trade" : "hold";
    } else {
      result.decisionType = "hold";
    }

    await snapshotNetWorth(db, agent.id, sessionId);
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
        out.push(await runAgentSession(db, env, agent, sessionId));
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
