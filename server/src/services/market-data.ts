import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { assets } from "../db/schema";

interface PriceQuote {
  assetId: string;
  symbol: string;
  externalId: string;
  ok: boolean;
  price?: number;
  error?: string;
}

interface CoinGeckoResponse {
  [externalId: string]: { usd?: number };
}

interface FinnhubQuote {
  c?: number;
  t?: number;
}

type EnabledAsset = typeof assets.$inferSelect;

async function getCryptoPrices(
  env: { COINGECKO_API_KEY?: string },
  enabled: EnabledAsset[],
): Promise<PriceQuote[]> {
  if (enabled.length === 0) return [];

  const ids = enabled.map((a) => a.externalId).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;

  const headers: Record<string, string> = {
    "User-Agent": "trading-arena/1.0 (https://trading-arena.app)",
    Accept: "application/json",
  };
  if (env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = env.COINGECKO_API_KEY;
  }

  let data: CoinGeckoResponse = {};
  let fetchError: string | undefined;

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

  return enabled.map((a) => {
    const base = { assetId: a.id, symbol: a.symbol, externalId: a.externalId };
    if (fetchError) return { ...base, ok: false, error: fetchError };
    const entry = data[a.externalId];
    if (!entry || typeof entry.usd !== "number") {
      return { ...base, ok: false, error: "missing in CoinGecko response" };
    }
    return { ...base, ok: true, price: entry.usd };
  });
}

async function getStockPrices(
  env: { FINNHUB_API_KEY: string },
  enabled: EnabledAsset[],
): Promise<PriceQuote[]> {
  if (enabled.length === 0) return [];

  if (!env.FINNHUB_API_KEY) {
    return enabled.map((a) => ({
      assetId: a.id,
      symbol: a.symbol,
      externalId: a.externalId,
      ok: false,
      error: "FINNHUB_API_KEY not configured",
    }));
  }

  return Promise.all(
    enabled.map(async (a): Promise<PriceQuote> => {
      const base = { assetId: a.id, symbol: a.symbol, externalId: a.externalId };
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(a.externalId)}&token=${env.FINNHUB_API_KEY}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          return {
            ...base,
            ok: false,
            error: `Finnhub ${response.status}: ${(await response.text()).slice(0, 200)}`,
          };
        }
        const data = (await response.json()) as FinnhubQuote;
        if (typeof data.c !== "number" || data.c === 0) {
          return {
            ...base,
            ok: false,
            error: "Finnhub returned 0 or missing price (symbol unknown or market closed without prior data)",
          };
        }
        return { ...base, ok: true, price: data.c };
      } catch (err) {
        return { ...base, ok: false, error: err instanceof Error ? err.message : "fetch failed" };
      }
    }),
  );
}

export interface RefreshResult {
  crypto: { ok: number; failed: number };
  stock: { ok: number; failed: number };
  updated: number;
  failures: Array<{ symbol: string; error: string }>;
}

export async function refreshAssetPrices(
  env: { FINNHUB_API_KEY: string; COINGECKO_API_KEY?: string },
  db: Database,
): Promise<RefreshResult> {
  const enabled = await db.query.assets.findMany({ where: eq(assets.enabled, true) });
  const cryptoAssets = enabled.filter((a) => a.assetType === "crypto");
  const stockAssets = enabled.filter((a) => a.assetType === "stock");

  const [cryptoQuotes, stockQuotes] = await Promise.all([
    getCryptoPrices(env, cryptoAssets),
    getStockPrices(env, stockAssets),
  ]);

  let updated = 0;
  const failures: Array<{ symbol: string; error: string }> = [];

  for (const q of [...cryptoQuotes, ...stockQuotes]) {
    if (!q.ok || typeof q.price !== "number") {
      failures.push({ symbol: q.symbol, error: q.error ?? "unknown" });
      continue;
    }
    await db.update(assets).set({ currentPrice: q.price }).where(eq(assets.id, q.assetId));
    updated += 1;
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
    updated,
    failures,
  };
}
