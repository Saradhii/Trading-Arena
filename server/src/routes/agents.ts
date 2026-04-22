import { Hono } from "hono";
import { createDb } from "../db";
import { eq } from "drizzle-orm";
import { aiAgents } from "../db/schema";
import { getPortfolio, snapshotNetWorth } from "../tools/trading";

export const agentRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

agentRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const agents = await db.query.aiAgents.findMany();
  return c.json(agents);
});

agentRoutes.get("/:agentId", async (c) => {
  const db = createDb(c.env.DB);
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, c.req.param("agentId")),
  });
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  return c.json(agent);
});

agentRoutes.get("/:agentId/portfolio", async (c) => {
  const db = createDb(c.env.DB);
  const portfolio = await getPortfolio(db, c.req.param("agentId"));
  return c.json(portfolio);
});

agentRoutes.get("/:agentId/networth", async (c) => {
  const db = createDb(c.env.DB);
  const portfolio = await getPortfolio(db, c.req.param("agentId"));
  return c.json({ netWorth: portfolio.netWorth, cashBalance: portfolio.cashBalance, portfolioValue: portfolio.portfolioValue });
});

agentRoutes.post("/:agentId/snapshot/:sessionId", async (c) => {
  const db = createDb(c.env.DB);
  const netWorth = await snapshotNetWorth(db, c.req.param("agentId"), c.req.param("sessionId"));
  return c.json({ netWorth });
});
