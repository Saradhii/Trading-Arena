import { Hono } from "hono";
import { orders, tradingSessions, netWorthSnapshots } from "../db/schema";
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

dashboardRoutes.get("/networth-history", async (c) => {
  const db = c.get("db");

  const snapshots = await db.query.netWorthSnapshots.findMany({
    with: { agent: true, session: true },
  });

  const byAgent = new Map<string, { agentName: string; points: { sessionNumber: number; netWorth: number }[] }>();
  for (const s of snapshots) {
    const entry = byAgent.get(s.agentId) ?? { agentName: s.agent.agentName, points: [] };
    entry.points.push({ sessionNumber: s.session.sessionNumber, netWorth: s.netWorth });
    byAgent.set(s.agentId, entry);
  }

  const series = Array.from(byAgent.entries()).map(([agentId, v]) => ({
    agentId,
    agentName: v.agentName,
    points: v.points.sort((a, b) => a.sessionNumber - b.sessionNumber),
  }));

  return c.json(series);
});

dashboardRoutes.get("/trades-by-session", async (c) => {
  const db = c.get("db");

  const rows = await db
    .select({
      sessionId: orders.sessionId,
      sessionNumber: tradingSessions.sessionNumber,
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .innerJoin(tradingSessions, eq(orders.sessionId, tradingSessions.id))
    .groupBy(orders.sessionId, tradingSessions.sessionNumber)
    .orderBy(tradingSessions.sessionNumber);

  return c.json(rows);
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
