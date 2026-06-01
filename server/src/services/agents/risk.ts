import type { AgentAction, AgentContext, RiskConstraints } from "./types";

export interface RiskRejection {
  action: AgentAction;
  reason: string;
}

export interface RiskResult {
  actions: AgentAction[];
  rejections: RiskRejection[];
}

export function enforceRiskConstraints(
  actions: AgentAction[],
  context: AgentContext,
  constraints: RiskConstraints,
): RiskResult {
  const out: AgentAction[] = [];
  const rejections: RiskRejection[] = [];

  const netWorth = context.portfolio.netWorth;
  const priceBySymbol = new Map(context.market.map((m) => [m.symbol, m.currentPrice]));
  const typeBySymbol = new Map(context.market.map((m) => [m.symbol, m.assetType]));

  const positionValue = new Map<string, number>();
  const sectorValue = new Map<string, number>();
  for (const h of context.portfolio.holdings) {
    positionValue.set(h.symbol, h.currentValue);
    const type = typeBySymbol.get(h.symbol) ?? "unknown";
    sectorValue.set(type, (sectorValue.get(type) ?? 0) + h.currentValue);
  }

  let trades = 0;
  const maxTrades = constraints.maxTradesPerSession ?? Infinity;

  for (const action of actions) {
    if (action.type === "hold") {
      out.push(action);
      continue;
    }

    if (trades >= maxTrades) {
      rejections.push({ action, reason: `exceeds maxTradesPerSession (${maxTrades})` });
      continue;
    }

    if (action.type === "market_sell") {
      out.push(action);
      trades++;
      continue;
    }

    const symbol = action.symbol!;
    const price = priceBySymbol.get(symbol);
    if (!price || price <= 0 || netWorth <= 0) {
      rejections.push({ action, reason: "no price / net worth for sizing" });
      continue;
    }
    const type = typeBySymbol.get(symbol) ?? "unknown";
    const requestedValue = (action.quantity ?? 0) * price;

    let allowedValue = requestedValue;
    if (constraints.maxPositionSizePct !== undefined) {
      const cap = constraints.maxPositionSizePct * netWorth - (positionValue.get(symbol) ?? 0);
      allowedValue = Math.min(allowedValue, cap);
    }
    if (constraints.maxSectorPct !== undefined) {
      const cap = constraints.maxSectorPct * netWorth - (sectorValue.get(type) ?? 0);
      allowedValue = Math.min(allowedValue, cap);
    }

    if (allowedValue <= 0) {
      rejections.push({ action, reason: "position/sector cap leaves no room" });
      continue;
    }

    const finalValue = Math.min(requestedValue, allowedValue);
    const finalQty = finalValue / price;
    const clamped = finalValue < requestedValue - 1e-9;

    out.push({
      ...action,
      quantity: finalQty,
      reasoning: clamped
        ? `${action.reasoning} [size clamped by risk mandate]`
        : action.reasoning,
    });
    positionValue.set(symbol, (positionValue.get(symbol) ?? 0) + finalValue);
    sectorValue.set(type, (sectorValue.get(type) ?? 0) + finalValue);
    trades++;
  }

  return { actions: out, rejections };
}
