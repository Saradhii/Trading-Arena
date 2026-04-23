import { Hono } from "hono";
import { createDb } from "../db";
import { getMarketOverview, getAssetPrice } from "../tools/trading";
import { assets } from "../db/schema";
import { eq } from "drizzle-orm";

export const assetRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

assetRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const assets = await getMarketOverview(db);
  return c.json(assets);
});

assetRoutes.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const body = await c.req.json<{
    symbol: string;
    name: string;
    assetType: "crypto" | "stock";
    currentPrice: number;
  }>();

  if (!body.symbol || !body.name || !body.assetType || !body.currentPrice) {
    return c.json({ error: "symbol, name, assetType, and currentPrice are required" }, 400);
  }

  const existing = await db.query.assets.findFirst({
    where: eq(assets.symbol, body.symbol.toUpperCase()),
  });
  if (existing) {
    return c.json({ error: "Asset with this symbol already exists" }, 409);
  }

  const asset = await db.insert(assets).values({
    id: crypto.randomUUID(),
    symbol: body.symbol.toUpperCase(),
    name: body.name,
    assetType: body.assetType,
    currentPrice: body.currentPrice,
  }).returning();

  return c.json(asset[0], 201);
});

assetRoutes.put("/:symbol/price", async (c) => {
  const db = createDb(c.env.DB);
  const symbol = c.req.param("symbol").toUpperCase();
  const { price } = await c.req.json<{ price: number }>();

  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, symbol),
  });
  if (!asset) return c.json({ error: "Asset not found" }, 404);

  const updated = await db
    .update(assets)
    .set({ currentPrice: price, lastUpdated: new Date() })
    .where(eq(assets.id, asset.id))
    .returning();

  return c.json(updated[0]);
});

assetRoutes.get("/:symbol", async (c) => {
  const db = createDb(c.env.DB);
  const symbol = c.req.param("symbol");
  const asset = await getAssetPrice(db, symbol);
  return c.json(asset);
});
