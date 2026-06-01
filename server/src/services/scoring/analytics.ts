import { asc } from "drizzle-orm";
import type { Database } from "../../db";
import { netWorthSnapshots, sessionLogs, agentRatings } from "../../db/schema";
import { sharpe, sortino, maxDrawdown, totalReturn, returnsFromEquity } from "./metrics";
import { estimateCostUsd } from "./pricing";

export interface AgentAnalytics {
  agentId: string;
  agentName: string;
  provider: string;
  model: string;
  adapterType: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  netWorth: number;
  totalReturn: number;
  sharpe: number;

  sortino: number | null;
  maxDrawdown: number;
  sessionsPlayed: number;
  tokensUsed: number;
  estCostUsd: number;

  returnPerDollar: number | null;
}

export async function getAgentAnalytics(db: Database): Promise<AgentAnalytics[]> {
  const agents = await db.query.aiAgents.findMany();

  const allSnapshots = await db.query.netWorthSnapshots.findMany({
    orderBy: asc(netWorthSnapshots.createdAt),
  });
  const equityByAgent = new Map<string, number[]>();
  for (const s of allSnapshots) {
    (equityByAgent.get(s.agentId) ?? equityByAgent.set(s.agentId, []).get(s.agentId)!).push(
      s.netWorth,
    );
  }

  const logs = await db.query.sessionLogs.findMany();
  const tokensByAgent = new Map<string, number>();
  const costByAgent = new Map<string, number>();
  const sessionsByAgent = new Map<string, number>();
  for (const l of logs) {
    sessionsByAgent.set(l.agentId, (sessionsByAgent.get(l.agentId) ?? 0) + 1);
    const tokens = l.tokensUsed ?? 0;
    tokensByAgent.set(l.agentId, (tokensByAgent.get(l.agentId) ?? 0) + tokens);
    costByAgent.set(
      l.agentId,
      (costByAgent.get(l.agentId) ?? 0) + estimateCostUsd(l.providerUsed, tokens),
    );
  }

  const ratings = await db.query.agentRatings.findMany();
  const ratingByAgent = new Map(ratings.map((r) => [r.agentId, r]));

  const out: AgentAnalytics[] = agents.map((agent) => {
    const equity = equityByAgent.get(agent.id) ?? [];
    const returns = returnsFromEquity(equity);
    const netWorth = equity.length > 0 ? equity[equity.length - 1] : agent.cashBalance;
    const startCapital = equity.length > 0 ? equity[0] : agent.cashBalance;
    const profit = netWorth - startCapital;
    const cost = costByAgent.get(agent.id) ?? 0;
    const rating = ratingByAgent.get(agent.id);

    return {
      agentId: agent.id,
      agentName: agent.agentName,
      provider: agent.provider,
      model: agent.model,
      adapterType: agent.adapterType,
      rating: rating?.rating ?? 1200,
      wins: rating?.wins ?? 0,
      losses: rating?.losses ?? 0,
      draws: rating?.draws ?? 0,
      netWorth,
      totalReturn: totalReturn(equity),
      sharpe: sharpe(returns),
      sortino: Number.isFinite(sortino(returns)) ? sortino(returns) : null,
      maxDrawdown: maxDrawdown(equity),
      sessionsPlayed: sessionsByAgent.get(agent.id) ?? 0,
      tokensUsed: tokensByAgent.get(agent.id) ?? 0,
      estCostUsd: cost,
      returnPerDollar: cost > 0 ? profit / cost : null,
    };
  });

  out.sort((a, b) => b.rating - a.rating);
  return out;
}
