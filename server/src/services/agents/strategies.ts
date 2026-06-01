import type { AgentContext, AgentAction } from "./types";

export type StrategyName = "buy_and_hold" | "random" | "momentum" | "mean_reversion";

export const STRATEGY_NAMES: StrategyName[] = [
  "buy_and_hold",
  "random",
  "momentum",
  "mean_reversion",
];

export function makeRng(seed: string): () => number {

  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }

  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function recentReturns(context: AgentContext): Record<string, number> {
  const out: Record<string, number> = {};
  const history = context.priceHistory ?? {};
  for (const [symbol, points] of Object.entries(history)) {
    if (points.length < 2) continue;
    const first = points[0].price;
    const last = points[points.length - 1].price;
    if (first > 0) out[symbol] = (last - first) / first;
  }
  return out;
}

function priceOf(context: AgentContext, symbol: string): number | undefined {
  return context.market.find((m) => m.symbol === symbol)?.currentPrice;
}

export function buyAndHold(context: AgentContext): AgentAction[] {
  if (context.portfolio.holdings.length > 0) {
    return [{ type: "hold", reasoning: "Buy & hold: already allocated, holding." }];
  }
  const investable = context.portfolio.cashBalance * 0.98;
  const n = context.market.length;
  if (n === 0 || investable <= 0) {
    return [{ type: "hold", reasoning: "Buy & hold: nothing to allocate." }];
  }
  const perAsset = investable / n;
  return context.market
    .filter((m) => m.currentPrice > 0)
    .map((m) => ({
      type: "market_buy" as const,
      symbol: m.symbol,
      quantity: perAsset / m.currentPrice,
      reasoning: "Benchmark: equal-weight buy & hold allocation.",
      confidence: 0.5,
    }));
}

export function random(context: AgentContext, rng: () => number): AgentAction[] {
  const numTrades = Math.floor(rng() * 3);
  const actions: AgentAction[] = [];
  for (let i = 0; i < numTrades; i++) {
    const asset = context.market[Math.floor(rng() * context.market.length)];
    if (!asset || asset.currentPrice <= 0) continue;
    const isBuy = rng() > 0.5;
    if (isBuy) {
      const spend = context.portfolio.cashBalance * 0.1;
      if (spend <= 0) continue;
      actions.push({
        type: "market_buy",
        symbol: asset.symbol,
        quantity: spend / asset.currentPrice,
        reasoning: "Random benchmark trade.",
        confidence: 0.5,
      });
    } else {
      const holding = context.portfolio.holdings.find((h) => h.symbol === asset.symbol);
      if (!holding || holding.quantity <= 0) continue;
      actions.push({
        type: "market_sell",
        symbol: asset.symbol,
        quantity: holding.quantity * 0.5,
        reasoning: "Random benchmark trade.",
        confidence: 0.5,
      });
    }
  }
  return actions.length > 0 ? actions : [{ type: "hold", reasoning: "Random: no trades this session." }];
}

export function momentum(context: AgentContext): AgentAction[] {
  const returns = recentReturns(context);
  const symbols = Object.keys(returns);
  if (symbols.length === 0) {
    return [{ type: "hold", reasoning: "Momentum: insufficient price history." }];
  }

  const actions: AgentAction[] = [];

  for (const h of context.portfolio.holdings) {
    if ((returns[h.symbol] ?? 0) < 0 && h.quantity > 0) {
      actions.push({
        type: "market_sell",
        symbol: h.symbol,
        quantity: h.quantity,
        reasoning: `Momentum: ${h.symbol} rolling over (${(returns[h.symbol] * 100).toFixed(1)}%), exiting.`,
        confidence: 0.5,
      });
    }
  }

  const best = symbols.reduce((a, b) => (returns[a] >= returns[b] ? a : b));
  const price = priceOf(context, best);
  if (returns[best] > 0 && price && price > 0) {
    const spend = context.portfolio.cashBalance * 0.2;
    if (spend > 0) {
      actions.push({
        type: "market_buy",
        symbol: best,
        quantity: spend / price,
        reasoning: `Momentum: ${best} leading (${(returns[best] * 100).toFixed(1)}%), adding.`,
        confidence: 0.6,
      });
    }
  }

  return actions.length > 0 ? actions : [{ type: "hold", reasoning: "Momentum: no clear leader." }];
}

export function meanReversion(context: AgentContext): AgentAction[] {
  const returns = recentReturns(context);
  const symbols = Object.keys(returns);
  if (symbols.length === 0) {
    return [{ type: "hold", reasoning: "Mean reversion: insufficient price history." }];
  }

  const actions: AgentAction[] = [];

  for (const h of context.portfolio.holdings) {
    if ((returns[h.symbol] ?? 0) > 0.05 && h.quantity > 0) {
      actions.push({
        type: "market_sell",
        symbol: h.symbol,
        quantity: h.quantity * 0.5,
        reasoning: `Mean reversion: ${h.symbol} extended (${(returns[h.symbol] * 100).toFixed(1)}%), trimming.`,
        confidence: 0.5,
      });
    }
  }

  const worst = symbols.reduce((a, b) => (returns[a] <= returns[b] ? a : b));
  const price = priceOf(context, worst);
  if (returns[worst] < 0 && price && price > 0) {
    const spend = context.portfolio.cashBalance * 0.2;
    if (spend > 0) {
      actions.push({
        type: "market_buy",
        symbol: worst,
        quantity: spend / price,
        reasoning: `Mean reversion: ${worst} oversold (${(returns[worst] * 100).toFixed(1)}%), buying.`,
        confidence: 0.5,
      });
    }
  }

  return actions.length > 0 ? actions : [{ type: "hold", reasoning: "Mean reversion: nothing stretched." }];
}

export function runStrategy(
  strategy: StrategyName,
  context: AgentContext,
  rng: () => number,
): AgentAction[] {
  switch (strategy) {
    case "buy_and_hold":
      return buyAndHold(context);
    case "random":
      return random(context, rng);
    case "momentum":
      return momentum(context);
    case "mean_reversion":
      return meanReversion(context);
    default:
      return [{ type: "hold", reasoning: `Unknown strategy: ${strategy}` }];
  }
}
