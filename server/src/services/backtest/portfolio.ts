import { computeFill, type FillConfig, DEFAULT_FILL_CONFIG } from "../fills";
import type { AgentAction } from "../agents/types";

interface Position {
  quantity: number;
  averageBuyPrice: number;
}

export interface AppliedSimTrade {
  action: string;
  symbol: string;
  quantity: number;
  success: boolean;
  error?: string;
}

export class SimPortfolio {
  cash: number;
  readonly positions = new Map<string, Position>();

  constructor(
    startingCash: number,
    private readonly fillConfig: FillConfig = DEFAULT_FILL_CONFIG,
  ) {
    this.cash = startingCash;
  }

  apply(action: AgentAction, priceBySymbol: Record<string, number>): AppliedSimTrade {
    const base = { action: action.type, symbol: action.symbol ?? "", quantity: action.quantity ?? 0 };
    if (action.type === "hold") return { ...base, success: true };
    if (!action.symbol || action.quantity === undefined || action.quantity <= 0) {
      return { ...base, success: false, error: "invalid action" };
    }
    const price = priceBySymbol[action.symbol];
    if (!price || price <= 0) return { ...base, success: false, error: "no price" };

    if (action.type === "market_buy") {
      const fill = computeFill("buy", price, action.quantity, this.fillConfig);
      if (this.cash < fill.cashDelta) return { ...base, success: false, error: "insufficient funds" };
      this.cash -= fill.cashDelta;
      const pos = this.positions.get(action.symbol);
      if (pos) {
        const newQty = pos.quantity + action.quantity;
        pos.averageBuyPrice =
          (pos.averageBuyPrice * pos.quantity + fill.effectivePrice * action.quantity) / newQty;
        pos.quantity = newQty;
      } else {
        this.positions.set(action.symbol, {
          quantity: action.quantity,
          averageBuyPrice: fill.effectivePrice,
        });
      }
      return { ...base, success: true };
    }

    const pos = this.positions.get(action.symbol);
    if (!pos || pos.quantity < action.quantity) {
      return { ...base, success: false, error: "insufficient holdings" };
    }
    const fill = computeFill("sell", price, action.quantity, this.fillConfig);
    this.cash += fill.cashDelta;
    pos.quantity -= action.quantity;
    if (pos.quantity < 1e-10) this.positions.delete(action.symbol);
    return { ...base, success: true };
  }

  netWorth(priceBySymbol: Record<string, number>): number {
    let value = 0;
    for (const [symbol, pos] of this.positions) {
      value += pos.quantity * (priceBySymbol[symbol] ?? pos.averageBuyPrice);
    }
    return this.cash + value;
  }

  holdingsSnapshot(priceBySymbol: Record<string, number>) {
    return Array.from(this.positions.entries()).map(([symbol, pos]) => {
      const currentPrice = priceBySymbol[symbol] ?? pos.averageBuyPrice;
      const currentValue = pos.quantity * currentPrice;
      return {
        symbol,
        name: symbol,
        quantity: pos.quantity,
        averageBuyPrice: pos.averageBuyPrice,
        currentPrice,
        currentValue,
        pnl: currentValue - pos.quantity * pos.averageBuyPrice,
      };
    });
  }
}
