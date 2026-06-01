import type { AgentAdapter, AgentContext } from "../agents/types";
import { SimPortfolio } from "./portfolio";
import {
  sharpe,
  sortino,
  maxDrawdown,
  totalReturn,
  returnsFromEquity,
} from "../scoring/metrics";

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface BacktestInput {
  adapter: AgentAdapter;
  agentId: string;
  agentName: string;

  series: Record<string, PricePoint[]>;
  assetTypes?: Record<string, string>;
  startingCash?: number;

  historyWindow?: number;
}

export interface BacktestResult {
  agentId: string;
  agentName: string;
  steps: number;
  equityCurve: number[];
  finalNetWorth: number;
  totalReturn: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
}

export async function runBacktest(input: BacktestInput): Promise<BacktestResult> {
  const startingCash = input.startingCash ?? 100000;
  const historyWindow = input.historyWindow ?? 30;
  const portfolio = new SimPortfolio(startingCash);

  const symbols = Object.keys(input.series);
  const length = Math.min(...symbols.map((s) => input.series[s].length));
  const equityCurve: number[] = [];

  for (let i = 0; i < length; i++) {
    const priceBySymbol: Record<string, number> = {};
    const priceHistory: Record<string, PricePoint[]> = {};
    for (const sym of symbols) {
      priceBySymbol[sym] = input.series[sym][i].price;
      const from = Math.max(0, i - historyWindow + 1);
      priceHistory[sym] = input.series[sym].slice(from, i + 1);
    }

    const context: AgentContext = {
      agentId: input.agentId,
      agentName: input.agentName,
      sessionId: `backtest-${i}`,
      sessionNumber: i + 1,
      portfolio: {
        cashBalance: portfolio.cash,
        portfolioValue: portfolio.netWorth(priceBySymbol) - portfolio.cash,
        netWorth: portfolio.netWorth(priceBySymbol),
        holdings: portfolio.holdingsSnapshot(priceBySymbol),
      },
      market: symbols.map((sym) => ({
        symbol: sym,
        name: sym,
        currentPrice: priceBySymbol[sym],
        assetType: input.assetTypes?.[sym] ?? "crypto",
      })),
      priceHistory,
    };

    const decision = await input.adapter.decide(context);
    for (const action of decision.actions) {
      portfolio.apply(action, priceBySymbol);
    }

    equityCurve.push(portfolio.netWorth(priceBySymbol));
  }

  const returns = returnsFromEquity(equityCurve);
  return {
    agentId: input.agentId,
    agentName: input.agentName,
    steps: length,
    equityCurve,
    finalNetWorth: equityCurve[equityCurve.length - 1] ?? startingCash,
    totalReturn: totalReturn(equityCurve),
    sharpe: sharpe(returns),
    sortino: sortino(returns),
    maxDrawdown: maxDrawdown(equityCurve),
  };
}
