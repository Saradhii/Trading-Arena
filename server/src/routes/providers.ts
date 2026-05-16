import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { aiAgents } from "../db/schema";
import { AppType } from "../middleware";
import { PROVIDER_MAP } from "../services/llm";

export const providerRoutes = new Hono<AppType>();

providerRoutes.get("/", async (c) => {
  const db = c.get("db");
  const search = c.req.query("search")?.trim().toLowerCase() ?? "";
  const status = c.req.query("status");

  const rows = await db
    .select({
      id: aiAgents.id,
      agentName: aiAgents.agentName,
      model: aiAgents.model,
      provider: aiAgents.provider,
      parentCompany: aiAgents.parentCompany,
    })
    .from(aiAgents);

  const agentsByProvider = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = agentsByProvider.get(row.provider) ?? [];
    list.push(row);
    agentsByProvider.set(row.provider, list);
  }

  let providers = Object.entries(PROVIDER_MAP).map(([id, provider]) => ({
    id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    agents: agentsByProvider.get(id) ?? [],
  }));

  if (status === "active") {
    providers = providers.filter((p) => p.agents.length > 0);
  } else if (status === "inactive") {
    providers = providers.filter((p) => p.agents.length === 0);
  }

  if (search) {
    providers = providers.filter((p) => {
      if (p.id.toLowerCase().includes(search)) return true;
      if (p.name.toLowerCase().includes(search)) return true;
      return p.agents.some(
        (a) =>
          a.agentName.toLowerCase().includes(search) ||
          a.model.toLowerCase().includes(search),
      );
    });
  }

  return c.json(providers);
});

providerRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const provider = PROVIDER_MAP[id];
  if (!provider) return c.json({ error: "Provider not found" }, 404);

  const db = c.get("db");
  const agents = await db
    .select({
      id: aiAgents.id,
      agentName: aiAgents.agentName,
      model: aiAgents.model,
      parentCompany: aiAgents.parentCompany,
    })
    .from(aiAgents)
    .where(eq(aiAgents.provider, id));

  return c.json({
    id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    agents,
  });
});
