import { Hono } from "hono";
import { runTradingSession } from "../services/trading-session";
import { createDb } from "../db";
import { desc } from "drizzle-orm";
import { sessionLogs, tradingSessions } from "../db/schema";

export const tradingSessionRoutes = new Hono<{
  Bindings: { DB: D1Database; GROQ_API_KEY: string; CEREBRAS_API_KEY: string; OPENROUTER_API_KEY: string; FINNHUB_API_KEY: string; ZAI_API_KEY: string; GOOGLE_API_KEY: string; COINGECKO_API_KEY: string };
}>();

tradingSessionRoutes.post("/run", async (c) => {
  const result = await runTradingSession(c.env);
  return c.json(result, 201);
});

tradingSessionRoutes.get("/logs", async (c) => {
  const db = createDb(c.env.DB);
  const logs = await db.query.sessionLogs.findMany({
    orderBy: desc(sessionLogs.id),
    with: { agent: true, session: true },
  });
  return c.json(logs);
});

tradingSessionRoutes.get("/logs/summary", async (c) => {
  const db = createDb(c.env.DB);
  const sessions = await db.query.tradingSessions.findMany({
    orderBy: desc(tradingSessions.sessionNumber),
    with: { sessionLogs: { with: { agent: true } } },
  });

  const summary = sessions.map((session) => ({
    sessionNumber: session.sessionNumber,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    totalAgents: session.sessionLogs.length,
    success: session.sessionLogs.filter((l) => l.status === "success").length,
    skipped: session.sessionLogs.filter((l) => l.status === "skipped").length,
    failed: session.sessionLogs.filter((l) => l.status === "failed").length,
    totalTrades: session.sessionLogs.reduce((sum, l) => sum + (l.toolCallsMade ?? 0), 0),
    agents: session.sessionLogs.map((l) => ({
      agentId: l.agent?.agentId,
      agentName: l.agent?.agentName,
      providerUsed: l.providerUsed,
      status: l.status,
      trades: l.toolCallsMade,
      latencyMs: l.latencyMs,
      failureReason: l.failureReason,
    })),
  }));

  return c.json(summary);
});
