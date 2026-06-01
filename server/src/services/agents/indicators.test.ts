import { describe, expect, test } from "bun:test";
import {
  simpleMovingAverage,
  exponentialMovingAverage,
  relativeStrengthIndex,
  pearson,
  toReturns,
  computeIndicator,
} from "./indicators";

describe("simpleMovingAverage", () => {
  test("averages the last `period` values", () => {
    expect(simpleMovingAverage([1, 2, 3, 4, 5], 3)).toBe(4);
  });
  test("null when insufficient data", () => {
    expect(simpleMovingAverage([1, 2], 3)).toBeNull();
  });
});

describe("exponentialMovingAverage", () => {
  test("equals the value for a flat series", () => {
    expect(exponentialMovingAverage([10, 10, 10, 10], 2)).toBeCloseTo(10, 6);
  });
  test("weights a recent jump more than the SMA", () => {
    const prices = [10, 10, 10, 10, 10, 20];
    const ema = exponentialMovingAverage(prices, 3)!;
    const sma = simpleMovingAverage(prices, 3)!;
    expect(ema).toBeGreaterThan(sma);
  });
});

describe("relativeStrengthIndex", () => {
  test("is 100 for a monotonic uptrend", () => {
    const prices = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(relativeStrengthIndex(prices, 14)).toBe(100);
  });
  test("is between 0 and 100 for mixed moves", () => {
    const prices = [10, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16];
    const rsi = relativeStrengthIndex(prices, 14)!;
    expect(rsi).toBeGreaterThan(0);
    expect(rsi).toBeLessThan(100);
  });
  test("null when insufficient data", () => {
    expect(relativeStrengthIndex([1, 2, 3], 14)).toBeNull();
  });
});

describe("pearson", () => {
  test("perfect positive correlation", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 6);
  });
  test("perfect negative correlation", () => {
    expect(pearson([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 6);
  });
  test("null for constant series", () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
  });
});

describe("toReturns / computeIndicator", () => {
  test("toReturns computes pct changes", () => {
    expect(toReturns([100, 110, 99])).toEqual([0.1, -0.1]);
  });
  test("computeIndicator dispatches by name", () => {
    expect(computeIndicator("SMA", [2, 4, 6], 3)).toBe(4);
    expect(computeIndicator("RSI", [1, 2, 3], 14)).toBeNull();
  });
});
