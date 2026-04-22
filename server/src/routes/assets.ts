import { Hono } from "hono";
import { createDb } from "../db";
import { getMarketOverview, getAssetPrice } from "../tools/trading";

export const assetRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

assetRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const assets = await getMarketOverview(db);
  return c.json(assets);
});

assetRoutes.get("/:symbol", async (c) => {
  const db = createDb(c.env.DB);
  const symbol = c.req.param("symbol");
  const asset = await getAssetPrice(db, symbol);
  return c.json(asset);
});
