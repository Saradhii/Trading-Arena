import { Hono } from "hono";
import { getMarketOverview, getAssetPrice } from "../tools/trading";
import { assets } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { AppType } from "../middleware";
import { ERRORS } from "../helpers";

export const assetRoutes = new Hono<AppType>();

assetRoutes.get("/", async (c) => {
  const db = c.get("db");
  const assets = await getMarketOverview(db);
  return c.json(assets);
});

assetRoutes.post("/", async (c) => {
  const db = c.get("db");
  const body = await c.req.json<{
    symbol: string;
    name: string;
    assetType: "crypto" | "stock";
    externalId: string;
    exchange?: string;
    currentPrice: number;
    enabled?: boolean;
  }>();

  if (!body.symbol || !body.name || !body.assetType || !body.externalId || body.currentPrice === undefined) {
    return c.json(
      { error: "symbol, name, assetType, externalId, and currentPrice are required" },
      400,
    );
  }

  const existing = await db.query.assets.findFirst({
    where: and(eq(assets.symbol, body.symbol.toUpperCase()), eq(assets.assetType, body.assetType)),
  });
  if (existing) {
    return c.json({ error: "Asset with this symbol and type already exists" }, 409);
  }

  const asset = await db
    .insert(assets)
    .values({
      id: crypto.randomUUID(),
      symbol: body.symbol.toUpperCase(),
      name: body.name,
      assetType: body.assetType,
      externalId: body.externalId,
      exchange: body.exchange ?? null,
      enabled: body.enabled ?? true,
      currentPrice: body.currentPrice,
    })
    .returning();

  return c.json(asset[0], 201);
});

assetRoutes.put("/:symbol/price", async (c) => {
  const db = c.get("db");
  const symbol = c.req.param("symbol").toUpperCase();
  const { price } = await c.req.json<{ price: number }>();

  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, symbol),
  });
  if (!asset) return c.json({ error: ERRORS.ASSET_NOT_FOUND }, 404);

  const updated = await db
    .update(assets)
    .set({ currentPrice: price })
    .where(eq(assets.id, asset.id))
    .returning();

  return c.json(updated[0]);
});

assetRoutes.get("/:symbol", async (c) => {
  const db = c.get("db");
  const symbol = c.req.param("symbol");
  const asset = await getAssetPrice(db, symbol);
  return c.json(asset);
});
