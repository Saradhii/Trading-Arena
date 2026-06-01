import { asc } from "drizzle-orm";
import type { Database } from "../../db";
import { priceHistory, assets } from "../../db/schema";
import { AlgorithmicAdapter } from "../agents/algorithmic-adapter";
import { STRATEGY_NAMES } from "../agents/strategies";
import type { Agent } from "../agents/types";
import { runBacktest, type PricePoint, type BacktestResult } from "./engine";

export { runBacktest } from "./engine";
export type { BacktestResult, BacktestInput, PricePoint } from "./engine";

const MIN_POINTS = 5;

function syntheticAgent(strategy: string): Agent {
  return {
    id: `backtest-${strategy}`,
    agentName: strategy,
    provider: "algorithmic",
    model: strategy,
    adapterType: "algorithmic",
    adapterConfig: null,
  } as unknown as Agent;
}

export async function backtestBaselinesFromHistory(
  db: Database,
): Promise<{ steps: number; results: BacktestResult[]; note?: string }> {
  const rows = await db.query.priceHistory.findMany({ orderBy: asc(priceHistory.recordedAt) });
  const assetRows = await db.query.assets.findMany();
  const typeBySymbol: Record<string, string> = {};
  for (const a of assetRows) typeBySymbol[a.symbol] = a.assetType;

  const series: Record<string, PricePoint[]> = {};
  for (const r of rows) {
    (series[r.symbol] ??= []).push({ timestamp: r.recordedAt.getTime(), price: r.price });
  }

  const symbols = Object.keys(series);
  const minLen = symbols.length > 0 ? Math.min(...symbols.map((s) => series[s].length)) : 0;
  if (minLen < MIN_POINTS) {
    return {
      steps: minLen,
      results: [],
      note: `insufficient price history (${minLen} points; need ${MIN_POINTS})`,
    };
  }

  const results: BacktestResult[] = [];
  for (const strategy of STRATEGY_NAMES) {
    const adapter = new AlgorithmicAdapter(syntheticAgent(strategy), strategy);
    results.push(
      await runBacktest({
        adapter,
        agentId: `backtest-${strategy}`,
        agentName: strategy,
        series,
        assetTypes: typeBySymbol,
      }),
    );
  }

  results.sort((a, b) => b.finalNetWorth - a.finalNetWorth);
  return { steps: minLen, results };
}
