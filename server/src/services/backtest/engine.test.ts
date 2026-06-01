import { describe, expect, test } from "bun:test";
import { runBacktest, type PricePoint } from "./engine";
import { SimPortfolio } from "./portfolio";
import { AlgorithmicAdapter } from "../agents/algorithmic-adapter";
import type { Agent } from "../agents/types";

function series(prices: number[]): PricePoint[] {
  return prices.map((price, i) => ({ timestamp: i, price }));
}

const fakeAgent = (id: string): Agent =>
  ({
    id,
    agentName: id,
    provider: "algorithmic",
    model: "x",
    cashBalance: 100000,
    adapterType: "algorithmic",
    adapterConfig: null,
  }) as unknown as Agent;

describe("SimPortfolio", () => {
  test("buy then sell round-trips cash minus costs", () => {
    const p = new SimPortfolio(100000);
    p.apply({ type: "market_buy", symbol: "BTC", quantity: 10, reasoning: "" }, { BTC: 100 });
    expect(p.cash).toBeLessThan(100000);
    expect(p.netWorth({ BTC: 100 })).toBeLessThan(100000);
    p.apply({ type: "market_sell", symbol: "BTC", quantity: 10, reasoning: "" }, { BTC: 100 });
    expect(p.positions.size).toBe(0);
  });

  test("rejects oversized sells and underfunded buys", () => {
    const p = new SimPortfolio(50);
    expect(p.apply({ type: "market_buy", symbol: "BTC", quantity: 10, reasoning: "" }, { BTC: 100 }).success).toBe(false);
    expect(p.apply({ type: "market_sell", symbol: "BTC", quantity: 1, reasoning: "" }, { BTC: 100 }).success).toBe(false);
  });
});

describe("runBacktest", () => {
  test("buy & hold profits in a rising market", async () => {
    const adapter = new AlgorithmicAdapter(fakeAgent("baseline-buy-hold"), "buy_and_hold");
    const result = await runBacktest({
      adapter,
      agentId: "baseline-buy-hold",
      agentName: "Buy & Hold",
      series: {
        BTC: series([100, 105, 110, 120, 130, 140]),
        ETH: series([50, 52, 55, 58, 60, 63]),
      },
    });
    expect(result.steps).toBe(6);
    expect(result.finalNetWorth).toBeGreaterThan(100000);
    expect(result.equityCurve).toHaveLength(6);
  });

  test("produces a coherent equity curve and metrics", async () => {
    const adapter = new AlgorithmicAdapter(fakeAgent("baseline-momentum"), "momentum");
    const result = await runBacktest({
      adapter,
      agentId: "baseline-momentum",
      agentName: "Momentum",
      series: {
        BTC: series([100, 110, 105, 115, 120, 118, 125]),
        ETH: series([100, 98, 102, 101, 99, 103, 104]),
      },
    });
    expect(result.equityCurve).toHaveLength(7);
    expect(Number.isFinite(result.sharpe)).toBe(true);
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
  });
});
