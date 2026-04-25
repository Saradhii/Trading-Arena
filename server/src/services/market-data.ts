import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { assets, cryptos, stocks } from "../db/schema";

export interface PriceQuote {
  symbol: string;
  externalId: string;
  ok: boolean;
  price?: number;
  error?: string;
  fetchedAt: number;
}

interface CoinGeckoResponse {
  [externalId: string]: { usd?: number };
}

interface FinnhubQuote {
  c?: number;
  t?: number;
}

export async function getCryptoPrices(
  env: { COINGECKO_API_KEY?: string },
  db: Database,
): Promise<PriceQuote[]> {
  const enabled = await db.query.cryptos.findMany({
    where: eq(cryptos.enabled, true),
  });
  if (enabled.length === 0) return [];

  const fetchedAt = Date.now();
  const ids = enabled.map((c) => c.externalId).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;

  let data: CoinGeckoResponse = {};
  let fetchError: string | undefined;

  const headers: Record<string, string> = {
    "User-Agent": "trading-arena/1.0 (https://trading-arena.app)",
    Accept: "application/json",
  };
  if (env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = env.COINGECKO_API_KEY;
  }

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      fetchError = `CoinGecko ${response.status}: ${(await response.text()).slice(0, 200)}`;
    } else {
      data = (await response.json()) as CoinGeckoResponse;
    }
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "fetch failed";
  }

  return enabled.map((c) => {
    if (fetchError) {
      return { symbol: c.symbol, externalId: c.externalId, ok: false, error: fetchError, fetchedAt };
    }
    const entry = data[c.externalId];
    if (!entry || typeof entry.usd !== "number") {
      return { symbol: c.symbol, externalId: c.externalId, ok: false, error: "missing in CoinGecko response", fetchedAt };
    }
    return { symbol: c.symbol, externalId: c.externalId, ok: true, price: entry.usd, fetchedAt };
  });
}

export async function getStockPrices(
  env: { FINNHUB_API_KEY: string },
  db: Database,
): Promise<PriceQuote[]> {
  const enabled = await db.query.stocks.findMany({
    where: eq(stocks.enabled, true),
  });
  if (enabled.length === 0) return [];

  const fetchedAt = Date.now();

  if (!env.FINNHUB_API_KEY) {
    return enabled.map((s) => ({
      symbol: s.symbol,
      externalId: s.externalId,
      ok: false,
      error: "FINNHUB_API_KEY not configured",
      fetchedAt,
    }));
  }

  const results = await Promise.all(
    enabled.map(async (s): Promise<PriceQuote> => {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(s.externalId)}&token=${env.FINNHUB_API_KEY}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          return {
            symbol: s.symbol,
            externalId: s.externalId,
            ok: false,
            error: `Finnhub ${response.status}: ${(await response.text()).slice(0, 200)}`,
            fetchedAt,
          };
        }
        const data = (await response.json()) as FinnhubQuote;
        if (typeof data.c !== "number" || data.c === 0) {
          return {
            symbol: s.symbol,
            externalId: s.externalId,
            ok: false,
            error: "Finnhub returned 0 or missing price (symbol unknown or market closed without prior data)",
            fetchedAt,
          };
        }
        return { symbol: s.symbol, externalId: s.externalId, ok: true, price: data.c, fetchedAt };
      } catch (err) {
        return {
          symbol: s.symbol,
          externalId: s.externalId,
          ok: false,
          error: err instanceof Error ? err.message : "fetch failed",
          fetchedAt,
        };
      }
    }),
  );

  return results;
}

export interface RefreshResult {
  crypto: { ok: number; failed: number };
  stock: { ok: number; failed: number };
  upserted: number;
  failures: Array<{ symbol: string; error: string }>;
}

export async function refreshAssetPrices(
  env: { FINNHUB_API_KEY: string; COINGECKO_API_KEY?: string },
  db: Database,
): Promise<RefreshResult> {
  const [cryptoQuotes, stockQuotes, cryptoRows, stockRows] = await Promise.all([
    getCryptoPrices(env, db),
    getStockPrices(env, db),
    db.query.cryptos.findMany({ where: eq(cryptos.enabled, true) }),
    db.query.stocks.findMany({ where: eq(stocks.enabled, true) }),
  ]);

  const cryptoNames = new Map(cryptoRows.map((c) => [c.symbol, c.name]));
  const stockNames = new Map(stockRows.map((s) => [s.symbol, s.name]));

  const now = new Date();
  let upserted = 0;
  const failures: Array<{ symbol: string; error: string }> = [];

  const upsertOne = async (
    symbol: string,
    name: string,
    assetType: "crypto" | "stock",
    price: number,
  ) => {
    await db
      .insert(assets)
      .values({
        id: crypto.randomUUID(),
        symbol,
        name,
        assetType,
        currentPrice: price,
        lastUpdated: now,
      })
      .onConflictDoUpdate({
        target: assets.symbol,
        set: { currentPrice: price, lastUpdated: now },
      });
    upserted += 1;
  };

  for (const q of cryptoQuotes) {
    if (!q.ok || typeof q.price !== "number") {
      failures.push({ symbol: q.symbol, error: q.error ?? "unknown" });
      continue;
    }
    await upsertOne(q.symbol, cryptoNames.get(q.symbol) ?? q.symbol, "crypto", q.price);
  }
  for (const q of stockQuotes) {
    if (!q.ok || typeof q.price !== "number") {
      failures.push({ symbol: q.symbol, error: q.error ?? "unknown" });
      continue;
    }
    await upsertOne(q.symbol, stockNames.get(q.symbol) ?? q.symbol, "stock", q.price);
  }

  return {
    crypto: {
      ok: cryptoQuotes.filter((q) => q.ok).length,
      failed: cryptoQuotes.filter((q) => !q.ok).length,
    },
    stock: {
      ok: stockQuotes.filter((q) => q.ok).length,
      failed: stockQuotes.filter((q) => !q.ok).length,
    },
    upserted,
    failures,
  };
}
