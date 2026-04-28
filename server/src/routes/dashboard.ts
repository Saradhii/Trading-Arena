import { Hono } from "hono";
import { createDb } from "../db";
import { orders, tradingSessions } from "../db/schema";
import { sql, desc, eq } from "drizzle-orm";
import { getPortfolio } from "../tools/trading";

export const dashboardRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

dashboardRoutes.get("/stats", async (c) => {
  const db = createDb(c.env.DB);

  const [agents, sessions, tradeCountResult] = await Promise.all([
    db.query.aiAgents.findMany(),
    db.query.tradingSessions.findMany(),
    db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "executed")),
  ]);

  const portfolios = await Promise.all(
    agents.map((a) => getPortfolio(db, a.agentId))
  );

  const totalAUM = portfolios.reduce((sum, p) => sum + p.netWorth, 0);
  const best = portfolios.length > 0
    ? portfolios.reduce((a, b) => (a.netWorth > b.netWorth ? a : b))
    : null;

  return c.json({
    totalAUM,
    totalSessions: sessions.length,
    totalTrades: tradeCountResult[0]?.count ?? 0,
    bestPerformer: best
      ? { agentName: best.agentName, netWorth: best.netWorth }
      : null,
  });
});

dashboardRoutes.get("/recent-orders", async (c) => {
  const db = createDb(c.env.DB);

  const latestSession = await db.query.tradingSessions.findFirst({
    orderBy: desc(tradingSessions.sessionNumber),
  });
  if (!latestSession) return c.json({ sessionNumber: 0, completedAt: null, orders: [] });

  const sessionOrders = await db.query.orders.findMany({
    where: eq(orders.sessionId, latestSession.id),
    with: { agent: true, asset: true },
  });

  return c.json({
    sessionNumber: latestSession.sessionNumber,
    completedAt: latestSession.completedAt,
    orders: sessionOrders,
  });
});
