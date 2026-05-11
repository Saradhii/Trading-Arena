import { Hono } from "hono";
import { createDb } from "../db";
import { eq } from "drizzle-orm";
import { agentDecisions, aiAgents, holdings, netWorthSnapshots, sessionLogs } from "../db/schema";
import { getPortfolio, snapshotNetWorth } from "../tools/trading";

export const agentRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

agentRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const agents = await db.query.aiAgents.findMany();

  const agentsWithPortfolio = await Promise.all(
    agents.map(async (agent) => {
      try {
        const portfolio = await getPortfolio(db, agent.id);
        return {
          ...agent,
          portfolioValue: portfolio.portfolioValue,
          netWorth: portfolio.netWorth,
        };
      } catch {
        return {
          ...agent,
          portfolioValue: 0,
          netWorth: agent.cashBalance,
        };
      }
    })
  );

  return c.json(agentsWithPortfolio);
});

agentRoutes.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.id, c.req.param("id")),
  });
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  return c.json(agent);
});

agentRoutes.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{
    id: string;
    agentName: string;
    provider: string;
    model: string;
    parametersCount?: string;
    releaseDate?: string;
    parentCompany?: string;
    cashBalance?: number;
  }>();

  if (!body.id || !body.agentName || !body.provider || !body.model) {
    return c.json(
      { error: "id, agentName, provider, and model are required" },
      400,
    );
  }

  const existing = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.id, body.id),
  });
  if (existing) {
    return c.json({ error: "Agent with this id already exists" }, 409);
  }

  const agent = await db
    .insert(aiAgents)
    .values({
      id: body.id,
      agentName: body.agentName,
      provider: body.provider,
      model: body.model,
      parametersCount: body.parametersCount ?? null,
      releaseDate: body.releaseDate ?? null,
      parentCompany: body.parentCompany ?? null,
      cashBalance: body.cashBalance ?? 100000,
    })
    .returning();

  return c.json(agent[0], 201);
});

agentRoutes.put("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const existing = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.id, id),
  });
  if (!existing) return c.json({ error: "Agent not found" }, 404);

  const body = await c.req.json<{
    agentName?: string;
    provider?: string;
    model?: string;
    parametersCount?: string;
    releaseDate?: string;
    parentCompany?: string;
  }>();

  const updates: Record<string, unknown> = {};
  if (body.agentName !== undefined) updates.agentName = body.agentName;
  if (body.provider !== undefined) updates.provider = body.provider;
  if (body.model !== undefined) updates.model = body.model;
  if (body.parametersCount !== undefined)
    updates.parametersCount = body.parametersCount;
  if (body.releaseDate !== undefined) updates.releaseDate = body.releaseDate;
  if (body.parentCompany !== undefined)
    updates.parentCompany = body.parentCompany;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const updated = await db
    .update(aiAgents)
    .set(updates)
    .where(eq(aiAgents.id, id))
    .returning();

  return c.json(updated[0]);
});

agentRoutes.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const id = c.req.param("id");

  const existing = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.id, id),
  });
  if (!existing) return c.json({ error: "Agent not found" }, 404);

  await db.delete(holdings).where(eq(holdings.agentId, existing.id));
  await db.delete(netWorthSnapshots).where(eq(netWorthSnapshots.agentId, existing.id));
  await db.delete(agentDecisions).where(eq(agentDecisions.agentId, existing.id));
  await db.delete(sessionLogs).where(eq(sessionLogs.agentId, existing.id));
  await db.delete(aiAgents).where(eq(aiAgents.id, existing.id));

  return c.json({ success: true });
});

agentRoutes.get("/:id/portfolio", async (c) => {
  const db = createDb(c.env.DB);
  const portfolio = await getPortfolio(db, c.req.param("id"));
  return c.json(portfolio);
});

agentRoutes.get("/:id/networth", async (c) => {
  const db = createDb(c.env.DB);
  const portfolio = await getPortfolio(db, c.req.param("id"));
  return c.json({
    netWorth: portfolio.netWorth,
    cashBalance: portfolio.cashBalance,
    portfolioValue: portfolio.portfolioValue,
  });
});

agentRoutes.post("/:id/snapshot/:sessionId", async (c) => {
  const db = createDb(c.env.DB);
  const netWorth = await snapshotNetWorth(
    db,
    c.req.param("id"),
    c.req.param("sessionId"),
  );
  return c.json({ netWorth });
});
