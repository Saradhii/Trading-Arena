import { Hono } from "hono";
import { runTradingSession } from "../services/trading-session";
import { desc } from "drizzle-orm";
import { sessionLogs, tradingSessions } from "../db/schema";
import { AppType } from "../middleware";

export const tradingSessionRoutes = new Hono<AppType>();

tradingSessionRoutes.post("/run", async (c) => {
  const result = await runTradingSession(c.env);
  return c.json(result, 201);
});

tradingSessionRoutes.get("/logs", async (c) => {
  const db = c.get("db");
  const logs = await db.query.sessionLogs.findMany({
    orderBy: desc(sessionLogs.id),
    with: { agent: true, session: true },
  });
  return c.json(logs);
});

tradingSessionRoutes.get("/logs/summary", async (c) => {
  const db = c.get("db");
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
      agentId: l.agent?.id,
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
