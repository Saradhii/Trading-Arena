import { Hono } from "hono";
import { eq, and, desc, count } from "drizzle-orm";
import { createDb } from "../db";
import { orders, aiAgents, assets, tradingSessions } from "../db/schema";
import { marketBuy, marketSell, limitBuy, limitSell, getOtherAgentsActions } from "../tools/trading";

export const orderRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

orderRoutes.post("/market-buy", async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{ agentId: string; assetSymbol: string; quantity: number; reasoning: string; sessionId: string }>();
  const order = await marketBuy(db, body.agentId, body.assetSymbol, body.quantity, body.reasoning, body.sessionId);
  return c.json(order, 201);
});

orderRoutes.post("/market-sell", async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{ agentId: string; assetSymbol: string; quantity: number; reasoning: string; sessionId: string }>();
  const order = await marketSell(db, body.agentId, body.assetSymbol, body.quantity, body.reasoning, body.sessionId);
  return c.json(order, 201);
});

orderRoutes.post("/limit-buy", async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{ agentId: string; assetSymbol: string; quantity: number; targetPrice: number; reasoning: string; sessionId: string }>();
  const order = await limitBuy(db, body.agentId, body.assetSymbol, body.quantity, body.targetPrice, body.reasoning, body.sessionId);
  return c.json(order, 201);
});

orderRoutes.post("/limit-sell", async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{ agentId: string; assetSymbol: string; quantity: number; targetPrice: number; reasoning: string; sessionId: string }>();
  const order = await limitSell(db, body.agentId, body.assetSymbol, body.quantity, body.targetPrice, body.reasoning, body.sessionId);
  return c.json(order, 201);
});

orderRoutes.get("/agent/:agentId/last-round", async (c) => {
  const db = createDb(c.env.DB);
  const sessionId = c.req.query("sessionId") ?? "";
  const orders = await getOtherAgentsActions(db, c.req.param("agentId"), sessionId);
  return c.json(orders);
});

orderRoutes.get("/history", async (c) => {
  const db = createDb(c.env.DB);

  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const agentId = c.req.query("agentId");
  const assetId = c.req.query("assetId");
  const orderType = c.req.query("orderType");
  const status = c.req.query("status");
  const sessionId = c.req.query("sessionId");

  const conditions = [];
  if (agentId) conditions.push(eq(orders.agentId, agentId));
  if (assetId) conditions.push(eq(orders.assetId, assetId));
  if (orderType) conditions.push(eq(orders.orderType, orderType as "market_buy" | "market_sell" | "limit_buy" | "limit_sell"));
  if (status) conditions.push(eq(orders.status, status as "pending" | "executed" | "cancelled"));
  if (sessionId) conditions.push(eq(orders.sessionId, sessionId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [orderRows, totalResult] = await Promise.all([
    db.query.orders.findMany({
      where: whereClause,
      with: {
        agent: true,
        asset: true,
        session: true,
      },
      orderBy: [desc(orders.createdAt)],
      limit,
      offset,
    }),
    db
      .select({ total: count() })
      .from(orders)
      .where(whereClause),
  ]);

  const total = totalResult[0]?.total ?? 0;

  return c.json({
    orders: orderRows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

orderRoutes.get("/filters", async (c) => {
  const db = createDb(c.env.DB);

  const [agentRows, assetRows, sessionRows] = await Promise.all([
    db
      .selectDistinct({ agentId: aiAgents.id, agentName: aiAgents.agentName })
      .from(aiAgents),
    db
      .selectDistinct({ assetId: assets.id, symbol: assets.symbol, name: assets.name })
      .from(assets),
    db
      .selectDistinct({ id: tradingSessions.id, sessionNumber: tradingSessions.sessionNumber })
      .from(tradingSessions),
  ]);

  return c.json({
    agents: agentRows,
    assets: assetRows,
    sessions: sessionRows,
    orderTypes: ["market_buy", "market_sell", "limit_buy", "limit_sell"],
    statuses: ["pending", "executed", "cancelled"],
  });
});
