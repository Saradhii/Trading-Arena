import type { Env } from "../llm/types";
import type { Database } from "../../db";
import type { aiAgents } from "../../db/schema";

export type Agent = typeof aiAgents.$inferSelect;

export interface AgentContext {
  agentId: string;
  agentName: string;

  sessionNumber: number;
  sessionId: string;

  portfolio: {
    cashBalance: number;
    portfolioValue: number;
    netWorth: number;
    holdings: Array<{
      symbol: string;
      name: string;
      quantity: number;
      averageBuyPrice: number;
      currentPrice: number;
      currentValue: number;
      pnl: number;
    }>;
  };

  market: Array<{
    symbol: string;
    name: string;
    currentPrice: number;
    assetType: string;
  }>;

  priceHistory?: Record<string, Array<{ timestamp: number; price: number }>>;

  orderFlow?: {
    sessionNumber: number;
    bySymbol: Record<
      string,
      { buyUnits: number; sellUnits: number; buyOrders: number; sellOrders: number }
    >;
  };

  memory?: {
    reflections: Array<{ sessionNumber: number; content: string }>;
    lessons: string[];
  };

  persona?: {
    id: string;
    name: string;
    promptAddendum: string;
    riskConstraints?: RiskConstraints;
  };
}

export interface RiskConstraints {
  maxPositionSizePct?: number;
  maxSectorPct?: number;
  maxTradesPerSession?: number;
}

export interface AgentAction {
  type: "market_buy" | "market_sell" | "hold";
  symbol?: string;
  quantity?: number;
  reasoning: string;

  confidence?: number;
}

export interface AgentResult {
  actions: AgentAction[];

  reasoning: string | null;
  providerUsed: string;
  modelUsed: string;
  tokensUsed?: number;
  latencyMs?: number;

  metadata?: Record<string, unknown>;
}

export interface AgentAdapter {
  readonly type: string;
  decide(context: AgentContext): Promise<AgentResult>;
}

export interface AdapterDeps {
  db: Database;
  env: Env;
  agent: Agent;
}
