import { Hono } from "hono";
import { createDb } from "../db";
import { netWorthSnapshots, aiAgents } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { getPortfolio } from "../tools/trading";

export const leaderboardRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

leaderboardRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const agents = await db.query.aiAgents.findMany();

  const leaderboard = await Promise.all(
    agents.map(async (agent) => {
      const portfolio = await getPortfolio(db, agent.agentId);
      return {
        agentId: agent.agentId,
        agentName: agent.agentName,
        parentCompany: agent.parentCompany,
        cashBalance: portfolio.cashBalance,
        portfolioValue: portfolio.portfolioValue,
        netWorth: portfolio.netWorth,
      };
    })
  );

  leaderboard.sort((a, b) => b.netWorth - a.netWorth);
  leaderboard.forEach((entry, i) => {
    (entry as Record<string, unknown>)["rank"] = i + 1;
  });

  return c.json(leaderboard);
});

leaderboardRoutes.get("/history/:agentId", async (c) => {
  const db = createDb(c.env.DB);
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, c.req.param("agentId")),
  });
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  const snapshots = await db.query.netWorthSnapshots.findMany({
    where: eq(netWorthSnapshots.agentId, agent.id),
    orderBy: desc(netWorthSnapshots.createdAt),
  });

  return c.json(snapshots);
});
