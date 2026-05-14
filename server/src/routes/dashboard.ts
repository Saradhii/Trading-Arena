import { Hono } from "hono";
import { orders, tradingSessions } from "../db/schema";
import { sql, desc, eq } from "drizzle-orm";
import { getAgentsWithPortfolios } from "../tools/trading";
import { AppType } from "../middleware";

export const dashboardRoutes = new Hono<AppType>();

dashboardRoutes.get("/stats", async (c) => {
  const db = c.get("db");

  const [agentsWithPortfolio, sessions, tradeCountResult] = await Promise.all([
    getAgentsWithPortfolios(db),
    db.query.tradingSessions.findMany(),
    db.select({ count: sql<number>`count(*)` }).from(orders),
  ]);

  const totalAUM = agentsWithPortfolio.reduce((sum, a) => sum + a.netWorth, 0);
  const best = agentsWithPortfolio.length > 0
    ? agentsWithPortfolio.reduce((a, b) => (a.netWorth > b.netWorth ? a : b))
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
  const db = c.get("db");

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
