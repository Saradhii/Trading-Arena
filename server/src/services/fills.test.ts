import { describe, expect, test } from "bun:test";
import { computeFill, DEFAULT_FILL_CONFIG } from "./fills";

describe("computeFill", () => {
  test("buy fills above the mark, sell below", () => {
    const buy = computeFill("buy", 100, 10);
    const sell = computeFill("sell", 100, 10);
    expect(buy.effectivePrice).toBeGreaterThan(100);
    expect(sell.effectivePrice).toBeLessThan(100);
  });

  test("slippage scales with notional and is capped", () => {
    const small = computeFill("buy", 100, 10);
    const large = computeFill("buy", 100, 5000);
    const huge = computeFill("buy", 100, 100_000);
    expect(large.slippageBps).toBeGreaterThan(small.slippageBps);
    expect(huge.slippageBps).toBe(DEFAULT_FILL_CONFIG.maxSlippageBps);
  });

  test("fee is charged on notional", () => {
    const f = computeFill("buy", 100, 100);

    expect(f.feePaid).toBeCloseTo(f.notional * 0.001, 6);
  });

  test("buy cashDelta exceeds notional, sell cashDelta is less", () => {
    const buy = computeFill("buy", 50, 20);
    const sell = computeFill("sell", 50, 20);
    expect(buy.cashDelta).toBeGreaterThan(buy.notional);
    expect(sell.cashDelta).toBeLessThan(sell.notional);
  });

  test("zero/invalid inputs are no-ops", () => {
    const f = computeFill("buy", 0, 10);
    expect(f.feePaid).toBe(0);
    expect(f.notional).toBe(0);
  });

  test("a tiny order has negligible slippage", () => {
    const f = computeFill("buy", 100, 1);
    expect(f.slippageBps).toBeLessThan(1);
  });
});
