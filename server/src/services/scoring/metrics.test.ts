import { describe, expect, test } from "bun:test";
import {
  sharpe,
  sortino,
  maxDrawdown,
  totalReturn,
  returnsFromEquity,
  brierScore,
  expectedScore,
  updateEloRatings,
} from "./metrics";

describe("returnsFromEquity / totalReturn", () => {
  test("computes period returns", () => {
    expect(returnsFromEquity([100, 110, 99])).toEqual([0.1, -0.1]);
  });
  test("total return over the curve", () => {
    expect(totalReturn([100, 150])).toBeCloseTo(0.5, 6);
  });
});

describe("sharpe / sortino", () => {
  test("sharpe is positive for steady gains", () => {
    expect(sharpe([0.01, 0.02, 0.015, 0.012])).toBeGreaterThan(0);
  });
  test("sharpe is zero with no volatility info", () => {
    expect(sharpe([0.01])).toBe(0);
  });
  test("sortino ignores upside volatility", () => {
    const r = [0.05, -0.01, 0.04, -0.02, 0.03];
    expect(sortino(r)).toBeGreaterThan(0);
  });
  test("sortino is Infinity when there is no downside", () => {
    expect(sortino([0.01, 0.02, 0.03])).toBe(Infinity);
  });
});

describe("maxDrawdown", () => {
  test("captures the worst peak-to-trough", () => {
    expect(maxDrawdown([100, 120, 60, 90])).toBeCloseTo(0.5, 6);
  });
  test("zero for a monotonic rise", () => {
    expect(maxDrawdown([100, 110, 120])).toBe(0);
  });
});

describe("brierScore", () => {
  test("perfect confident calls score 0", () => {
    expect(brierScore([{ confidence: 1, correct: true }, { confidence: 0, correct: false }])).toBe(0);
  });
  test("confident-but-wrong is heavily penalized", () => {
    expect(brierScore([{ confidence: 1, correct: false }])).toBe(1);
  });
  test("coin flip at 0.5 scores 0.25", () => {
    expect(brierScore([{ confidence: 0.5, correct: true }])).toBe(0.25);
  });
  test("null for no predictions", () => {
    expect(brierScore([])).toBeNull();
  });
});

describe("Elo", () => {
  test("expected score is 0.5 for equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 6);
  });
  test("winner gains, loser loses, sum conserved", () => {
    const out = updateEloRatings([
      { id: "a", rating: 1200, rank: 1 },
      { id: "b", rating: 1200, rank: 2 },
    ]);
    expect(out.a).toBeGreaterThan(1200);
    expect(out.b).toBeLessThan(1200);
    expect(out.a + out.b).toBeCloseTo(2400, 6);
  });
  test("ties leave equal ratings unchanged", () => {
    const out = updateEloRatings([
      { id: "a", rating: 1200, rank: 1 },
      { id: "b", rating: 1200, rank: 1 },
    ]);
    expect(out.a).toBeCloseTo(1200, 6);
    expect(out.b).toBeCloseTo(1200, 6);
  });
  test("single participant is unchanged", () => {
    expect(updateEloRatings([{ id: "a", rating: 1300, rank: 1 }])).toEqual({ a: 1300 });
  });
});
