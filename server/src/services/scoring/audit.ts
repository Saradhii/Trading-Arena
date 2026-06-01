import { asc } from "drizzle-orm";
import type { Database } from "../../db";
import { orders, agentDecisions, priceHistory } from "../../db/schema";
import { brierScore } from "./metrics";

export function directionCorrect(
  orderType: "market_buy" | "market_sell",
  entryPrice: number,
  laterPrice: number,
): boolean | null {
  if (laterPrice === entryPrice) return null;
  const up = laterPrice > entryPrice;
  return orderType === "market_buy" ? up : !up;
}

export interface AgentAudit {
  agentId: string;
  agentName: string;
  adapterType: string;
  decisions: number;
  holdRate: number;
  tradeCount: number;
  evaluableTrades: number;
  predictiveAccuracy: number | null;
  brier: number | null;
  cryptoAllocationPct: number;
  stockAllocationPct: number;
  anomalyFlags: string[];
}

const SUSPICIOUS_ACCURACY = 0.7;
const MIN_TRADES_FOR_FLAG = 20;

export async function getAgentAudit(db: Database): Promise<AgentAudit[]> {
  const agents = await db.query.aiAgents.findMany();
  const decisions = await db.query.agentDecisions.findMany();
  const allOrders = await db.query.orders.findMany({ orderBy: asc(orders.createdAt) });
  const history = await db.query.priceHistory.findMany({ orderBy: asc(priceHistory.recordedAt) });
  const holdings = await db.query.holdings.findMany({ with: { asset: true } });

  const histBySymbol = new Map<string, Array<{ t: number; price: number }>>();
  for (const h of history) {
    (histBySymbol.get(h.symbol) ?? histBySymbol.set(h.symbol, []).get(h.symbol)!).push({
      t: h.recordedAt.getTime(),
      price: h.price,
    });
  }
  const symbolByAssetId = new Map<string, string>();
  for (const h of holdings) {
    const asset = (h as { asset?: { id: string; symbol: string } }).asset;
    if (asset) symbolByAssetId.set(asset.id, asset.symbol);
  }

  function nextPriceAfter(symbol: string, t: number): number | null {
    const points = histBySymbol.get(symbol);
    if (!points) return null;
    for (const p of points) if (p.t > t) return p.price;
    return null;
  }

  const decisionsByAgent = groupBy(decisions, (d) => d.agentId);
  const ordersByAgent = groupBy(allOrders, (o) => o.agentId);

  const holdingsByAgent = groupBy(holdings, (h) => h.agentId);

  return agents.map((agent) => {
    const agentDecisionsList = decisionsByAgent.get(agent.id) ?? [];
    const agentOrders = ordersByAgent.get(agent.id) ?? [];

    const holds = agentDecisionsList.filter((d) => d.decisionType === "hold").length;
    const holdRate =
      agentDecisionsList.length > 0 ? holds / agentDecisionsList.length : 0;

    const evaluations: boolean[] = [];
    for (const o of agentOrders) {
      const symbol = symbolByAssetId.get(o.assetId);
      if (!symbol) continue;
      const entry = o.effectivePrice ?? o.priceAtOrder;
      const later = nextPriceAfter(symbol, o.createdAt.getTime());
      if (later === null) continue;
      const correct = directionCorrect(o.orderType, entry, later);
      if (correct !== null) evaluations.push(correct);
    }
    const predictiveAccuracy =
      evaluations.length > 0
        ? evaluations.filter(Boolean).length / evaluations.length
        : null;

    const predictions: Array<{ confidence: number; correct: boolean }> = [];
    for (const d of agentDecisionsList) {
      if (d.confidence === null || d.decisionType !== "trade") continue;

      const dOrders = agentOrders.filter((o) => o.sessionId === d.sessionId);
      let correct: boolean | null = null;
      for (const o of dOrders) {
        const symbol = symbolByAssetId.get(o.assetId);
        if (!symbol) continue;
        const later = nextPriceAfter(symbol, o.createdAt.getTime());
        if (later === null) continue;
        correct = directionCorrect(o.orderType, o.effectivePrice ?? o.priceAtOrder, later);
        if (correct !== null) break;
      }
      if (correct !== null) predictions.push({ confidence: d.confidence, correct });
    }

    const agentHoldings = holdingsByAgent.get(agent.id) ?? [];
    let crypto = 0;
    let stock = 0;
    for (const h of agentHoldings) {
      const asset = (h as { asset?: { assetType: string; currentPrice: number } }).asset;
      if (!asset) continue;
      const value = h.quantity * asset.currentPrice;
      if (asset.assetType === "crypto") crypto += value;
      else stock += value;
    }
    const totalAlloc = crypto + stock;

    const anomalyFlags: string[] = [];
    if (
      predictiveAccuracy !== null &&
      predictiveAccuracy > SUSPICIOUS_ACCURACY &&
      evaluations.length >= MIN_TRADES_FOR_FLAG
    ) {
      anomalyFlags.push("suspicious_predictive_accuracy");
    }

    return {
      agentId: agent.id,
      agentName: agent.agentName,
      adapterType: agent.adapterType,
      decisions: agentDecisionsList.length,
      holdRate,
      tradeCount: agentOrders.length,
      evaluableTrades: evaluations.length,
      predictiveAccuracy,
      brier: brierScore(predictions),
      cryptoAllocationPct: totalAlloc > 0 ? crypto / totalAlloc : 0,
      stockAllocationPct: totalAlloc > 0 ? stock / totalAlloc : 0,
      anomalyFlags,
    };
  });
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    (map.get(k) ?? map.set(k, []).get(k)!).push(item);
  }
  return map;
}
