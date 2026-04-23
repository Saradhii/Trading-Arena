import { eq, desc } from "drizzle-orm";
import { createDb } from "../db";
import type { Database } from "../db";
import { aiAgents, tradingSessions, sessionLogs } from "../db/schema";
import { getPortfolio, getMarketOverview, snapshotNetWorth } from "../tools/trading";
import { chatWithTools } from "../services/llm";
import { tradingTools } from "../services/llm/tools";
import { executeToolCalls } from "../services/llm/executor";
import type { LLMMessage, Env } from "../services/llm/types";
import { RateLimitError, ProviderError } from "../services/llm/types";

interface AgentSessionResult {
  agentId: string;
  agentName: string;
  status: "success" | "skipped" | "failed";
  failureReason?: string;
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

  return `You are ${agentName}, an AI trading agent competing in a trading arena against other AI agents.

## Your Portfolio
- Cash: $${portfolio.cashBalance.toFixed(2)}
- Portfolio Value: $${portfolio.portfolioValue.toFixed(2)}
- Net Worth: $${portfolio.netWorth.toFixed(2)}

### Holdings
${holdingsStr}

## Market Overview
${marketStr}

## Available Tools
- market_buy(assetSymbol, quantity, reasoning) — Buy at current market price
- market_sell(assetSymbol, quantity, reasoning) — Sell at current market price

## Rules
- You may make 0-2 trades per session
- You must include reasoning for every trade
- You can choose to hold (no tool calls = no trade)
- Consider diversification and risk management
- You are competing against other AI agents for highest net worth

Analyze the market and make your trading decisions now.`;
}

async function runAgentSession(
  db: Database,
  env: Env,
  agent: typeof aiAgents.$inferSelect,
  sessionId: string,
): Promise<AgentSessionResult> {
  const startTime = Date.now();

  const result: AgentSessionResult = {
    agentId: agent.agentId,
    agentName: agent.agentName,
    status: "success",
    trades: 0,
    tradeDetails: [],
    providerUsed: agent.provider,
    modelUsed: agent.model,
    latencyMs: 0,
  };

  try {
    const portfolio = await getPortfolio(db, agent.agentId);
    const market = await getMarketOverview(db);

    const systemPrompt = buildSystemPrompt(agent.agentName, portfolio, market);

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Make your trading decisions for this session." },
    ];

    const response = await chatWithTools(env, agent.agentId, messages, tradingTools);

    result.providerUsed = response.providerUsed;
    result.modelUsed = response.modelUsed;
    result.tokensUsed = response.tokensUsed;

    if (response.toolCalls && response.toolCalls.length > 0) {
      const execResults = await executeToolCalls(
        db,
        response.toolCalls,
        agent.agentId,
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
    }

    await snapshotNetWorth(db, agent.agentId, sessionId);
  } catch (err) {
    if (err instanceof RateLimitError) {
      result.status = "skipped";
      result.failureReason = "rate_limited";
    } else if (err instanceof ProviderError) {
      result.status = "failed";
      result.failureReason = `provider_error_${err.statusCode}`;
    } else {
      result.status = "failed";
      result.failureReason = err instanceof Error ? err.message : "unknown_error";
    }
  }

  result.latencyMs = Date.now() - startTime;

  const agentDbRecord = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, agent.agentId),
  });

  await db.insert(sessionLogs).values({
    sessionId,
    agentId: agentDbRecord!.id,
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

  const results: AgentSessionResult[] = [];

  for (const agent of agents) {
    const agentResult = await runAgentSession(db, env, agent, sessionId);
    results.push(agentResult);
  }

  await db
    .update(tradingSessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(tradingSessions.id, sessionId));

  return {
    sessionId,
    sessionNumber: nextNumber,
    results,
    totalTrades: results.reduce((sum, r) => sum + r.trades, 0),
    successfulAgents: results.filter((r) => r.status === "success").length,
    failedAgents: results.filter((r) => r.status !== "success").length,
  };
}
