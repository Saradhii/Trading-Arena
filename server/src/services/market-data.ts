import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { assets } from "../db/schema";

interface PriceQuote {
  assetId: string;
  symbol: string;
  externalId: string;
  ok: boolean;
  price?: number;
  logoUrl?: string;
  error?: string;
}

interface CoinGeckoMarket {
  id: string;
  current_price?: number;
  image?: string;
}

interface FinnhubQuote {
  c?: number;
  t?: number;
}

interface FinnhubProfile {
  logo?: string;
}

type EnabledAsset = typeof assets.$inferSelect;

async function getCryptoPrices(
  env: { COINGECKO_API_KEY?: string },
  enabled: EnabledAsset[],
): Promise<PriceQuote[]> {
  if (enabled.length === 0) return [];

  const ids = enabled.map((a) => a.externalId).join(",");
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}&per_page=${enabled.length}&sparkline=false`;

  const headers: Record<string, string> = {
    "User-Agent": "trading-arena/1.0 (https://trading-arena.app)",
    Accept: "application/json",
  };
  if (env.COINGECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = env.COINGECKO_API_KEY;
  }

  let data: CoinGeckoMarket[] = [];
  let fetchError: string | undefined;

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      fetchError = `CoinGecko ${response.status}: ${(await response.text()).slice(0, 200)}`;
    } else {
      data = (await response.json()) as CoinGeckoMarket[];
    }
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "fetch failed";
  }

  const byId = new Map(data.map((m) => [m.id, m]));

  return enabled.map((a) => {
    const base = { assetId: a.id, symbol: a.symbol, externalId: a.externalId };
    if (fetchError) return { ...base, ok: false, error: fetchError };
    const entry = byId.get(a.externalId);
    if (!entry || typeof entry.current_price !== "number") {
      return { ...base, ok: false, error: "missing in CoinGecko response" };
    }
    return { ...base, ok: true, price: entry.current_price, logoUrl: entry.image };
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
      const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(a.externalId)}&token=${env.FINNHUB_API_KEY}`;

      const logoFetch: Promise<string | undefined> = a.logoUrl
        ? Promise.resolve(a.logoUrl)
        : fetch(
            `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(a.externalId)}&token=${env.FINNHUB_API_KEY}`,
          )
            .then(async (r) => (r.ok ? ((await r.json()) as FinnhubProfile).logo : undefined))
            .catch(() => undefined);

      try {
        const [response, logoUrl] = await Promise.all([fetch(quoteUrl), logoFetch]);
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
        return { ...base, ok: true, price: data.c, logoUrl: logoUrl || undefined };
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
    const patch: { currentPrice: number; logoUrl?: string } = { currentPrice: q.price };
    if (q.logoUrl) patch.logoUrl = q.logoUrl;
    await db.update(assets).set(patch).where(eq(assets.id, q.assetId));
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
