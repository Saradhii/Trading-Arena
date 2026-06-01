import type { Database } from "../../db";
import { marketBuy, marketSell } from "../../tools/trading";
import type { AgentAction } from "./types";

export interface AppliedTrade {
  action: string;
  asset: string;
  quantity: number;
  reasoning: string;
  success: boolean;
  error?: string;
}

export async function applyActions(
  db: Database,
  agentId: string,
  sessionId: string,
  actions: AgentAction[],
): Promise<AppliedTrade[]> {
  const applied: AppliedTrade[] = [];

  for (const action of actions) {
    if (action.type === "hold") continue;
    if (!action.symbol || action.quantity === undefined || action.quantity <= 0) {
      applied.push({
        action: action.type,
        asset: action.symbol ?? "",
        quantity: action.quantity ?? 0,
        reasoning: action.reasoning,
        success: false,
        error: "Invalid action: missing or non-positive symbol/quantity",
      });
      continue;
    }

    try {
      if (action.type === "market_buy") {
        await marketBuy(db, agentId, action.symbol, action.quantity, action.reasoning, sessionId);
      } else {
        await marketSell(db, agentId, action.symbol, action.quantity, action.reasoning, sessionId);
      }
      applied.push({
        action: action.type,
        asset: action.symbol,
        quantity: action.quantity,
        reasoning: action.reasoning,
        success: true,
      });
    } catch (err) {
      applied.push({
        action: action.type,
        asset: action.symbol,
        quantity: action.quantity,
        reasoning: action.reasoning,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return applied;
}
