import { describe, expect, test } from "bun:test";
import { sanitizeActions } from "./validation";

const allowed = new Set(["BTC", "ETH"]);

describe("sanitizeActions", () => {
  test("accepts valid buy/sell/hold", () => {
    const { actions, dropped } = sanitizeActions(
      [
        { type: "market_buy", symbol: "BTC", quantity: 2, reasoning: "x", confidence: 0.7 },
        { type: "hold", reasoning: "wait" },
      ],
      allowed,
    );
    expect(dropped).toHaveLength(0);
    expect(actions).toHaveLength(2);
    expect(actions[0].symbol).toBe("BTC");
  });

  test("uppercases and allowlists symbols", () => {
    const { actions } = sanitizeActions(
      [{ type: "market_buy", symbol: "btc", quantity: 1, reasoning: "" }],
      allowed,
    );
    expect(actions[0].symbol).toBe("BTC");
  });

  test("drops unknown symbols", () => {
    const { actions, dropped } = sanitizeActions(
      [{ type: "market_buy", symbol: "DOGE", quantity: 1, reasoning: "" }],
      allowed,
    );
    expect(actions).toHaveLength(0);
    expect(dropped[0].reason).toMatch(/symbol/);
  });

  test("drops non-positive / non-finite quantities", () => {
    const { actions } = sanitizeActions(
      [
        { type: "market_buy", symbol: "BTC", quantity: 0, reasoning: "" },
        { type: "market_sell", symbol: "ETH", quantity: -3, reasoning: "" },
        { type: "market_buy", symbol: "BTC", quantity: Infinity, reasoning: "" },
      ],
      allowed,
    );
    expect(actions).toHaveLength(0);
  });

  test("drops invalid types and non-objects", () => {
    const { actions, dropped } = sanitizeActions(
      ["nope", 42, { type: "wire_transfer", symbol: "BTC", quantity: 1 }],
      allowed,
    );
    expect(actions).toHaveLength(0);
    expect(dropped).toHaveLength(3);
  });

  test("enforces maxActions cap", () => {
    const many = Array.from({ length: 10 }, () => ({
      type: "market_buy",
      symbol: "BTC",
      quantity: 1,
      reasoning: "",
    }));
    const { actions, dropped } = sanitizeActions(many, allowed, 3);
    expect(actions).toHaveLength(3);
    expect(dropped.length).toBe(7);
  });

  test("rejects non-array input", () => {
    const { actions, dropped } = sanitizeActions({ not: "an array" }, allowed);
    expect(actions).toHaveLength(0);
    expect(dropped).toHaveLength(1);
  });

  test("ignores out-of-range confidence", () => {
    const { actions } = sanitizeActions(
      [{ type: "market_buy", symbol: "BTC", quantity: 1, reasoning: "", confidence: 5 }],
      allowed,
    );
    expect(actions[0].confidence).toBeUndefined();
  });
});
