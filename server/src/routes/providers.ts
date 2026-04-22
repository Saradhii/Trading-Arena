import { Hono } from "hono";
import { createDb } from "../db";
import { eq } from "drizzle-orm";
import { llmProviders } from "../db/schema";
import { getProvidersStatus } from "../services/llm";

export const providerRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

providerRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const providers = await db.query.llmProviders.findMany({
    orderBy: [llmProviders.priority],
  });
  return c.json(providers);
});

providerRoutes.get("/status", async (c) => {
  const db = createDb(c.env.DB);

  const dbProviders = await db.query.llmProviders.findMany({
    orderBy: [llmProviders.priority],
  });

  const cachedStatus = getProvidersStatus();
  const statusMap = new Map(cachedStatus.map((s) => [s.name, s]));

  const merged = dbProviders.map((p) => ({
    ...p,
    liveStatus: statusMap.get(p.name) ?? null,
  }));

  return c.json(merged);
});

providerRoutes.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{
    name: string;
    baseUrl: string;
    priority: number;
  }>();

  if (!body.name || !body.baseUrl || !body.priority) {
    return c.json(
      { error: "name, baseUrl, and priority are required" },
      400,
    );
  }

  const existing = await db.query.llmProviders.findFirst({
    where: eq(llmProviders.name, body.name),
  });
  if (existing) {
    const updated = await db
      .update(llmProviders)
      .set({ baseUrl: body.baseUrl, priority: body.priority })
      .where(eq(llmProviders.id, existing.id))
      .returning();
    return c.json(updated[0]);
  }

  const provider = await db
    .insert(llmProviders)
    .values({
      id: crypto.randomUUID(),
      name: body.name,
      baseUrl: body.baseUrl,
      priority: body.priority,
    })
    .returning();

  return c.json(provider[0], 201);
});

providerRoutes.put("/:name/toggle", async (c) => {
  const db = createDb(c.env.DB);
  const name = c.req.param("name");

  const provider = await db.query.llmProviders.findFirst({
    where: eq(llmProviders.name, name),
  });
  if (!provider) return c.json({ error: "Provider not found" }, 404);

  const updated = await db
    .update(llmProviders)
    .set({ enabled: !provider.enabled })
    .where(eq(llmProviders.id, provider.id))
    .returning();

  return c.json(updated[0]);
});
