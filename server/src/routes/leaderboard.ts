import { Hono } from "hono";
import { netWorthSnapshots } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { getAgentsWithPortfolios } from "../tools/trading";
import { AppType } from "../middleware";
import { getAgentById, ERRORS } from "../helpers";

export const leaderboardRoutes = new Hono<AppType>();

leaderboardRoutes.get("/", async (c) => {
  const db = c.get("db");
  const agentsWithPortfolio = await getAgentsWithPortfolios(db);

  const leaderboard = agentsWithPortfolio.map((agent) => ({
    id: agent.id,
    agentName: agent.agentName,
    parentCompany: agent.parentCompany,
    cashBalance: agent.cashBalance,
    portfolioValue: agent.portfolioValue,
    netWorth: agent.netWorth,
  }));

  leaderboard.sort((a, b) => b.netWorth - a.netWorth);
  leaderboard.forEach((entry, i) => {
    (entry as Record<string, unknown>)["rank"] = i + 1;
  });

  return c.json(leaderboard);
});

leaderboardRoutes.get("/history/:id", async (c) => {
  const db = c.get("db");
  const agent = await getAgentById(db, c.req.param("id"));
  if (!agent) return c.json({ error: ERRORS.AGENT_NOT_FOUND }, 404);

  const snapshots = await db.query.netWorthSnapshots.findMany({
    where: eq(netWorthSnapshots.agentId, agent.id),
    orderBy: desc(netWorthSnapshots.createdAt),
  });

  return c.json(snapshots);
});
