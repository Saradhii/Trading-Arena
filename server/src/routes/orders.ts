import { Hono } from "hono";
import { createDb } from "../db";
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
