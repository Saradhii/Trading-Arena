import { describe, expect, test } from "bun:test";
import { enforceRiskConstraints } from "./risk";
import type { AgentContext, AgentAction } from "./types";

function ctx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    agentId: "a1",
    agentName: "Test",
    sessionId: "s1",
    sessionNumber: 1,
    portfolio: { cashBalance: 100000, portfolioValue: 0, netWorth: 100000, holdings: [] },
    market: [
      { symbol: "BTC", name: "Bitcoin", currentPrice: 100, assetType: "crypto" },
      { symbol: "ETH", name: "Ethereum", currentPrice: 100, assetType: "crypto" },
      { symbol: "AAPL", name: "Apple", currentPrice: 100, assetType: "stock" },
    ],
    ...overrides,
  };
}

const buy = (symbol: string, quantity: number): AgentAction => ({
  type: "market_buy",
  symbol,
  quantity,
  reasoning: "x",
});

describe("enforceRiskConstraints", () => {
  test("clamps a buy to maxPositionSizePct of net worth", () => {

    const { actions } = enforceRiskConstraints([buy("BTC", 1000)], ctx(), {
      maxPositionSizePct: 0.4,
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].quantity).toBeCloseTo(400, 6);
    expect(actions[0].reasoning).toMatch(/clamped/);
  });

  test("does not clamp when within the cap", () => {
    const { actions } = enforceRiskConstraints([buy("BTC", 100)], ctx(), {
      maxPositionSizePct: 0.4,
    });
    expect(actions[0].quantity).toBe(100);
    expect(actions[0].reasoning).not.toMatch(/clamped/);
  });

  test("enforces sector cap across multiple buys", () => {

    const { actions } = enforceRiskConstraints([buy("BTC", 400), buy("ETH", 400)], ctx(), {
      maxSectorPct: 0.5,
    });
    expect(actions[0].quantity).toBeCloseTo(400, 6);
    expect(actions[1].quantity).toBeCloseTo(100, 6);
  });

  test("rejects buys when caps leave no room", () => {
    const holdings = [
      { symbol: "BTC", name: "Bitcoin", quantity: 400, averageBuyPrice: 100, currentPrice: 100, currentValue: 40000, pnl: 0 },
    ];
    const { actions, rejections } = enforceRiskConstraints([buy("BTC", 100)], ctx({
      portfolio: { cashBalance: 60000, portfolioValue: 40000, netWorth: 100000, holdings },
    }), { maxPositionSizePct: 0.4 });
    expect(actions.filter((a) => a.type !== "hold")).toHaveLength(0);
    expect(rejections).toHaveLength(1);
  });

  test("caps the number of trades per session", () => {
    const { actions, rejections } = enforceRiskConstraints(
      [buy("BTC", 1), buy("ETH", 1), buy("AAPL", 1)],
      ctx(),
      { maxTradesPerSession: 2 },
    );
    expect(actions.filter((a) => a.type !== "hold")).toHaveLength(2);
    expect(rejections).toHaveLength(1);
  });

  test("sells are never clamped by position size", () => {
    const holdings = [
      { symbol: "BTC", name: "Bitcoin", quantity: 500, averageBuyPrice: 100, currentPrice: 100, currentValue: 50000, pnl: 0 },
    ];
    const sell: AgentAction = { type: "market_sell", symbol: "BTC", quantity: 500, reasoning: "exit" };
    const { actions } = enforceRiskConstraints([sell], ctx({
      portfolio: { cashBalance: 50000, portfolioValue: 50000, netWorth: 100000, holdings },
    }), { maxPositionSizePct: 0.1 });
    expect(actions[0].quantity).toBe(500);
  });
});
