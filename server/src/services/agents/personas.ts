import type { RiskConstraints } from "./types";

export interface StrategyPersona {
  id: string;
  name: string;

  promptAddendum: string;

  riskConstraints?: RiskConstraints;

  allowedTools?: string[];
}

export const PERSONAS: Record<string, StrategyPersona> = {
  aggressive_growth: {
    id: "aggressive_growth",
    name: "Aggressive Growth",
    promptAddendum:
      "You seek high-conviction, high-beta bets. You concentrate capital when conviction is strong and tolerate drawdowns while a thesis holds. You favor crypto and high-growth tech.",
    riskConstraints: { maxPositionSizePct: 0.4, maxSectorPct: 0.8, maxTradesPerSession: 3 },
    allowedTools: ["market_buy", "market_sell"],
  },
  conservative_income: {
    id: "conservative_income",
    name: "Conservative Income",
    promptAddendum:
      "You are capital-preservation first. You diversify broadly, cap any single position small, and prefer stable blue chips. You would rather miss upside than risk a large drawdown.",
    riskConstraints: { maxPositionSizePct: 0.15, maxSectorPct: 0.5, maxTradesPerSession: 1 },
    allowedTools: ["market_buy", "market_sell"],
  },
  quant_analyst: {
    id: "quant_analyst",
    name: "Quantitative Analyst",
    promptAddendum:
      "You only act on quantifiable edges. You examine price history and indicators before trading and never trade on gut feel. If the data shows no edge, you hold.",
    riskConstraints: { maxPositionSizePct: 0.25, maxSectorPct: 0.6, maxTradesPerSession: 2 },
    allowedTools: ["get_price_history", "calculate_indicator", "check_correlation", "market_buy", "market_sell"],
  },
};

export function getPersona(id: string | null | undefined): StrategyPersona | undefined {
  if (!id) return undefined;
  return PERSONAS[id];
}
