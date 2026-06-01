import { describe, expect, test } from "bun:test";
import { executeResearchTool, isResearchTool } from "./research-tools";
import type { AgentContext } from "./types";

const context: AgentContext = {
  agentId: "a1",
  agentName: "Test",
  sessionId: "s1",
  sessionNumber: 1,
  portfolio: { cashBalance: 100000, portfolioValue: 0, netWorth: 100000, holdings: [] },
  market: [
    { symbol: "BTC", name: "Bitcoin", currentPrice: 130, assetType: "crypto" },
    { symbol: "ETH", name: "Ethereum", currentPrice: 70, assetType: "crypto" },
  ],
  priceHistory: {

    BTC: [100, 110, 100, 110].map((price, i) => ({ timestamp: i, price })),
    ETH: [100, 90, 100, 90].map((price, i) => ({ timestamp: i, price })),
  },
};

describe("isResearchTool", () => {
  test("recognizes research tools and excludes trade tools", () => {
    expect(isResearchTool("get_price_history")).toBe(true);
    expect(isResearchTool("calculate_indicator")).toBe(true);
    expect(isResearchTool("market_buy")).toBe(false);
  });
});

describe("executeResearchTool", () => {
  test("get_price_history returns points", () => {
    const r = executeResearchTool("get_price_history", { symbol: "btc" }, context) as {
      symbol: string;
      points: unknown[];
    };
    expect(r.symbol).toBe("BTC");
    expect(r.points).toHaveLength(4);
  });

  test("get_price_history notes missing history", () => {
    const r = executeResearchTool("get_price_history", { symbol: "DOGE" }, context) as {
      points: unknown[];
      note?: string;
    };
    expect(r.points).toHaveLength(0);
    expect(r.note).toBeDefined();
  });

  test("calculate_indicator computes SMA", () => {
    const r = executeResearchTool(
      "calculate_indicator",
      { symbol: "BTC", indicator: "SMA", period: 2 },
      context,
    ) as { value: number };
    expect(r.value).toBe(105);
  });

  test("check_correlation finds inverse relationship", () => {
    const r = executeResearchTool(
      "check_correlation",
      { symbol1: "BTC", symbol2: "ETH" },
      context,
    ) as { correlation: number };
    expect(r.correlation).toBeLessThan(0);
  });

  test("get_order_flow returns per-symbol flow", () => {
    const withFlow: AgentContext = {
      ...context,
      orderFlow: {
        sessionNumber: 9,
        bySymbol: { BTC: { buyUnits: 5, sellUnits: 1, buyOrders: 3, sellOrders: 1 } },
      },
    };
    const all = executeResearchTool("get_order_flow", {}, withFlow) as {
      sessionNumber: number;
      bySymbol: Record<string, unknown>;
    };
    expect(all.sessionNumber).toBe(9);
    expect(all.bySymbol.BTC).toBeDefined();

    const one = executeResearchTool("get_order_flow", { symbol: "btc" }, withFlow) as {
      flow: { buyUnits: number };
    };
    expect(one.flow.buyUnits).toBe(5);
  });

  test("get_order_flow notes absence of prior data", () => {
    const r = executeResearchTool("get_order_flow", {}, context) as { note?: string };
    expect(r.note).toBeDefined();
  });

  test("unknown tool returns error", () => {
    const r = executeResearchTool("nope", {}, context) as { error: string };
    expect(r.error).toMatch(/unknown/);
  });
});
