import { Hono } from "hono";
import { tradingSessions, orders } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { AppType } from "../middleware";
import { ERRORS } from "../helpers";

export const sessionRoutes = new Hono<AppType>();

sessionRoutes.get("/", async (c) => {
  const db = c.get("db");
  const sessions = await db.query.tradingSessions.findMany({
    orderBy: desc(tradingSessions.sessionNumber),
  });
  return c.json(sessions);
});

sessionRoutes.get("/:sessionNumber", async (c) => {
  const db = c.get("db");
  const session = await db.query.tradingSessions.findFirst({
    where: eq(tradingSessions.sessionNumber, Number(c.req.param("sessionNumber"))),
  });
  if (!session) return c.json({ error: ERRORS.SESSION_NOT_FOUND }, 404);
  return c.json(session);
});

sessionRoutes.get("/:sessionNumber/orders", async (c) => {
  const db = c.get("db");
  const session = await db.query.tradingSessions.findFirst({
    where: eq(tradingSessions.sessionNumber, Number(c.req.param("sessionNumber"))),
  });
  if (!session) return c.json({ error: ERRORS.SESSION_NOT_FOUND }, 404);
  const sessionOrders = await db.query.orders.findMany({
    where: eq(orders.sessionId, session.id),
    with: { agent: true, asset: true },
  });
  return c.json(sessionOrders);
});

sessionRoutes.post("/", async (c) => {
  const db = c.get("db");
  const lastSession = await db.query.tradingSessions.findFirst({
    orderBy: desc(tradingSessions.sessionNumber),
  });
  const nextNumber = lastSession ? lastSession.sessionNumber + 1 : 1;

  const session = await db.insert(tradingSessions).values({
    id: crypto.randomUUID(),
    sessionNumber: nextNumber,
    status: "running",
  }).returning();

  return c.json(session[0], 201);
});

