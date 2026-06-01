import type { AgentAction } from "./types";

export interface SanitizeResult {
  actions: AgentAction[];
  dropped: Array<{ reason: string; raw: unknown }>;
}

const VALID_TYPES = new Set(["market_buy", "market_sell", "hold"]);

export function sanitizeActions(
  raw: unknown,
  allowedSymbols: Set<string>,
  maxActions = 5,
): SanitizeResult {
  const dropped: SanitizeResult["dropped"] = [];
  const actions: AgentAction[] = [];

  if (!Array.isArray(raw)) {
    return { actions: [], dropped: [{ reason: "actions is not an array", raw }] };
  }

  for (const item of raw) {
    if (actions.length >= maxActions) {
      dropped.push({ reason: "exceeds max actions", raw: item });
      continue;
    }
    if (typeof item !== "object" || item === null) {
      dropped.push({ reason: "action is not an object", raw: item });
      continue;
    }
    const a = item as Record<string, unknown>;
    const type = a.type;
    if (typeof type !== "string" || !VALID_TYPES.has(type)) {
      dropped.push({ reason: "invalid action type", raw: item });
      continue;
    }

    const reasoning = typeof a.reasoning === "string" ? a.reasoning : "";
    const confidence =
      typeof a.confidence === "number" && a.confidence >= 0 && a.confidence <= 1
        ? a.confidence
        : undefined;

    if (type === "hold") {
      actions.push({ type: "hold", reasoning, confidence });
      continue;
    }

    const symbol = typeof a.symbol === "string" ? a.symbol.toUpperCase() : undefined;
    const quantity = typeof a.quantity === "number" ? a.quantity : undefined;

    if (!symbol || !allowedSymbols.has(symbol)) {
      dropped.push({ reason: "unknown or missing symbol", raw: item });
      continue;
    }
    if (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0) {
      dropped.push({ reason: "invalid quantity", raw: item });
      continue;
    }

    actions.push({
      type: type as "market_buy" | "market_sell",
      symbol,
      quantity,
      reasoning,
      confidence,
    });
  }

  return { actions, dropped };
}
