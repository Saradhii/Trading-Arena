import { describe, expect, test } from "bun:test";
import { makeRng, buyAndHold, random, momentum, meanReversion } from "./strategies";
import type { AgentContext } from "./types";

function ctx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    agentId: "a1",
    agentName: "Test",
    sessionId: "s1",
    sessionNumber: 1,
    portfolio: { cashBalance: 100000, portfolioValue: 0, netWorth: 100000, holdings: [] },
    market: [
      { symbol: "BTC", name: "Bitcoin", currentPrice: 100, assetType: "crypto" },
      { symbol: "ETH", name: "Ethereum", currentPrice: 50, assetType: "crypto" },
    ],
    priceHistory: {},
    ...overrides,
  };
}

describe("makeRng", () => {
  test("is deterministic for the same seed", () => {
    const a = makeRng("seed");
    const b = makeRng("seed");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  test("differs across seeds", () => {
    expect(makeRng("x")()).not.toBe(makeRng("y")());
  });
});

describe("buyAndHold", () => {
  test("allocates across all assets when flat", () => {
    const actions = buyAndHold(ctx());
    expect(actions.every((a) => a.type === "market_buy")).toBe(true);
    expect(actions.map((a) => a.symbol).sort()).toEqual(["BTC", "ETH"]);

    const spend = actions.reduce((s, a) => s + (a.quantity ?? 0) * (a.symbol === "BTC" ? 100 : 50), 0);
    expect(spend).toBeLessThanOrEqual(100000);
  });
  test("holds once it has positions", () => {
    const actions = buyAndHold(
      ctx({ portfolio: { cashBalance: 10, portfolioValue: 1, netWorth: 11, holdings: [
        { symbol: "BTC", name: "Bitcoin", quantity: 1, averageBuyPrice: 90, currentPrice: 100, currentValue: 100, pnl: 10 },
      ] } }),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("hold");
  });
});

describe("random", () => {
  test("is reproducible and within 0-2 trades", () => {
    const a = random(ctx(), makeRng("a1:1"));
    const b = random(ctx(), makeRng("a1:1"));
    expect(a).toEqual(b);
    const trades = a.filter((x) => x.type !== "hold");
    expect(trades.length).toBeLessThanOrEqual(2);
  });
});

describe("momentum / mean reversion", () => {
  const history = {
    BTC: [{ timestamp: 1, price: 80 }, { timestamp: 2, price: 100 }],
    ETH: [{ timestamp: 1, price: 60 }, { timestamp: 2, price: 50 }],
  };

  test("momentum buys the leader", () => {
    const actions = momentum(ctx({ priceHistory: history }));
    const buy = actions.find((a) => a.type === "market_buy");
    expect(buy?.symbol).toBe("BTC");
  });

  test("mean reversion buys the loser", () => {
    const actions = meanReversion(ctx({ priceHistory: history }));
    const buy = actions.find((a) => a.type === "market_buy");
    expect(buy?.symbol).toBe("ETH");
  });

  test("both hold without history", () => {
    expect(momentum(ctx())[0].type).toBe("hold");
    expect(meanReversion(ctx())[0].type).toBe("hold");
  });
});
