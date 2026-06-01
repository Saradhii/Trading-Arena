import type { LLMToolDef } from "../llm/types";
import type { AgentContext } from "./types";
import { computeIndicator, pearson, toReturns, type IndicatorName } from "./indicators";

export const researchTools: LLMToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_price_history",
      description: "Get recent price history (oldest to newest) for an asset.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Asset symbol, e.g. BTC" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_indicator",
      description: "Compute a technical indicator (RSI, SMA, EMA) for an asset.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          indicator: { type: "string", enum: ["RSI", "SMA", "EMA"] },
          period: { type: "number", description: "Lookback period (optional)" },
        },
        required: ["symbol", "indicator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_correlation",
      description: "Pearson correlation of recent returns between two assets.",
      parameters: {
        type: "object",
        properties: {
          symbol1: { type: "string" },
          symbol2: { type: "string" },
        },
        required: ["symbol1", "symbol2"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_flow",
      description:
        "See what other agents bought/sold last session (crowd sentiment). Omit symbol for the whole market.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Optional asset symbol to filter" },
        },
      },
    },
  },
];

const RESEARCH_TOOL_NAMES = new Set(researchTools.map((t) => t.function.name));

export function isResearchTool(name: string): boolean {
  return RESEARCH_TOOL_NAMES.has(name);
}

function pricesFor(context: AgentContext, symbol: string): number[] {
  const points = context.priceHistory?.[symbol?.toUpperCase?.() ?? symbol] ?? context.priceHistory?.[symbol] ?? [];
  return points.map((p) => p.price);
}

export function executeResearchTool(
  name: string,
  args: Record<string, unknown>,
  context: AgentContext,
): unknown {
  switch (name) {
    case "get_price_history": {
      const symbol = String(args.symbol ?? "").toUpperCase();
      const points = context.priceHistory?.[symbol] ?? [];
      return points.length > 0
        ? { symbol, points }
        : { symbol, points: [], note: "no price history available yet" };
    }
    case "calculate_indicator": {
      const symbol = String(args.symbol ?? "").toUpperCase();
      const indicator = String(args.indicator ?? "") as IndicatorName;
      const period = typeof args.period === "number" ? args.period : undefined;
      const prices = pricesFor(context, symbol);
      const value = computeIndicator(indicator, prices, period);
      return value === null
        ? { symbol, indicator, value: null, note: "insufficient price history" }
        : { symbol, indicator, period: period ?? null, value };
    }
    case "check_correlation": {
      const s1 = String(args.symbol1 ?? "").toUpperCase();
      const s2 = String(args.symbol2 ?? "").toUpperCase();
      const corr = pearson(toReturns(pricesFor(context, s1)), toReturns(pricesFor(context, s2)));
      return corr === null
        ? { symbol1: s1, symbol2: s2, correlation: null, note: "insufficient overlapping history" }
        : { symbol1: s1, symbol2: s2, correlation: corr };
    }
    case "get_order_flow": {
      if (!context.orderFlow) {
        return { note: "no prior session order flow available" };
      }
      const symbol = args.symbol ? String(args.symbol).toUpperCase() : undefined;
      if (symbol) {
        return {
          sessionNumber: context.orderFlow.sessionNumber,
          symbol,
          flow: context.orderFlow.bySymbol[symbol] ?? {
            buyUnits: 0,
            sellUnits: 0,
            buyOrders: 0,
            sellOrders: 0,
          },
        };
      }
      return { sessionNumber: context.orderFlow.sessionNumber, bySymbol: context.orderFlow.bySymbol };
    }
    default:
      return { error: `unknown research tool: ${name}` };
  }
}
