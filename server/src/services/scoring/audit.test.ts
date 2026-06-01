import { describe, expect, test } from "bun:test";
import { directionCorrect } from "./audit";

describe("directionCorrect", () => {
  test("buy is correct when price rises", () => {
    expect(directionCorrect("market_buy", 100, 110)).toBe(true);
  });
  test("buy is wrong when price falls", () => {
    expect(directionCorrect("market_buy", 100, 90)).toBe(false);
  });
  test("sell is correct when price falls", () => {
    expect(directionCorrect("market_sell", 100, 90)).toBe(true);
  });
  test("sell is wrong when price rises", () => {
    expect(directionCorrect("market_sell", 100, 110)).toBe(false);
  });
  test("flat move is unscored", () => {
    expect(directionCorrect("market_buy", 100, 100)).toBeNull();
  });
});
