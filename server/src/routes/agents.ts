import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { agentDecisions, aiAgents, holdings, netWorthSnapshots, sessionLogs } from "../db/schema";
import { getPortfolio, snapshotNetWorth, getAgentsWithPortfolios } from "../tools/trading";
import { AppType } from "../middleware";
import { getAgentById, ERRORS } from "../helpers";

export const agentRoutes = new Hono<AppType>();

agentRoutes.get("/", async (c) => {
  const db = c.get("db");
  const search = c.req.query("search")?.trim().toLowerCase() ?? "";
  const status = c.req.query("status");

  let agents = await getAgentsWithPortfolios(db);

  if (status === "active") {
    agents = agents.filter((a) => a.holdings.length > 0);
  } else if (status === "inactive") {
    agents = agents.filter((a) => a.holdings.length === 0);
  }

  if (search) {
    agents = agents.filter((a) => {
      const fields = [a.agentName, a.provider, a.model, a.parentCompany];
      return fields.some((f) => f?.toLowerCase().includes(search));
    });
  }

  return c.json(agents);
});

agentRoutes.get("/:id", async (c) => {
  const db = c.get("db");
  const agent = await getAgentById(db, c.req.param("id"));
  if (!agent) return c.json({ error: ERRORS.AGENT_NOT_FOUND }, 404);
  return c.json(agent);
});

agentRoutes.post("/", async (c) => {
  const db = c.get("db");
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

  const existing = await getAgentById(db, body.id);
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
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await getAgentById(db, id);
  if (!existing) return c.json({ error: ERRORS.AGENT_NOT_FOUND }, 404);

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
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await getAgentById(db, id);
  if (!existing) return c.json({ error: ERRORS.AGENT_NOT_FOUND }, 404);

  await db.delete(holdings).where(eq(holdings.agentId, existing.id));
  await db.delete(netWorthSnapshots).where(eq(netWorthSnapshots.agentId, existing.id));
  await db.delete(agentDecisions).where(eq(agentDecisions.agentId, existing.id));
  await db.delete(sessionLogs).where(eq(sessionLogs.agentId, existing.id));
  await db.delete(aiAgents).where(eq(aiAgents.id, existing.id));

  return c.json({ success: true });
});

agentRoutes.get("/:id/portfolio", async (c) => {
  const db = c.get("db");
  const portfolio = await getPortfolio(db, c.req.param("id"));
  return c.json(portfolio);
});

agentRoutes.get("/:id/networth", async (c) => {
  const db = c.get("db");
  const portfolio = await getPortfolio(db, c.req.param("id"));
  return c.json({
    netWorth: portfolio.netWorth,
    cashBalance: portfolio.cashBalance,
    portfolioValue: portfolio.portfolioValue,
  });
});

agentRoutes.post("/:id/snapshot/:sessionId", async (c) => {
  const db = c.get("db");
  const netWorth = await snapshotNetWorth(
    db,
    c.req.param("id"),
    c.req.param("sessionId"),
  );
  return c.json({ netWorth });
});
