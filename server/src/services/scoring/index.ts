import { eq, desc, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import { agentRatings, ratingHistory, netWorthSnapshots } from "../../db/schema";
import { updateEloRatings, type EloEntry } from "./metrics";

export * from "./metrics";

interface Participant {
  agentId: string;
  sessionReturn: number;
}

export async function applySessionRatings(
  db: Database,
  sessionId: string,
  agentIds: string[],
): Promise<void> {
  if (agentIds.length < 2) return;

  const participants = await computeSessionReturns(db, sessionId, agentIds);
  if (participants.length < 2) return;

  const ranked = [...participants].sort((a, b) => b.sessionReturn - a.sessionReturn);
  const rankByAgent = new Map<string, number>();
  ranked.forEach((p, i) => rankByAgent.set(p.agentId, i + 1));

  const existing = await db.query.agentRatings.findMany({
    where: inArray(agentRatings.agentId, agentIds),
  });
  const ratingByAgent = new Map(existing.map((r) => [r.agentId, r]));

  const entries: EloEntry[] = participants.map((p) => ({
    id: p.agentId,
    rating: ratingByAgent.get(p.agentId)?.rating ?? 1200,
    rank: rankByAgent.get(p.agentId)!,
  }));

  const updated = updateEloRatings(entries);
  const medianRank = (participants.length + 1) / 2;

  for (const p of participants) {
    const before = ratingByAgent.get(p.agentId)?.rating ?? 1200;
    const after = updated[p.agentId];
    const rank = rankByAgent.get(p.agentId)!;
    const prior = ratingByAgent.get(p.agentId);

    const isWin = rank < medianRank;
    const isDraw = rank === medianRank;

    await db
      .insert(agentRatings)
      .values({
        agentId: p.agentId,
        rating: after,
        wins: prior ? prior.wins + (isWin ? 1 : 0) : isWin ? 1 : 0,
        losses: prior ? prior.losses + (!isWin && !isDraw ? 1 : 0) : !isWin && !isDraw ? 1 : 0,
        draws: prior ? prior.draws + (isDraw ? 1 : 0) : isDraw ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: agentRatings.agentId,
        set: {
          rating: after,
          wins: (prior?.wins ?? 0) + (isWin ? 1 : 0),
          losses: (prior?.losses ?? 0) + (!isWin && !isDraw ? 1 : 0),
          draws: (prior?.draws ?? 0) + (isDraw ? 1 : 0),
        },
      });

    await db.insert(ratingHistory).values({
      id: crypto.randomUUID(),
      agentId: p.agentId,
      sessionId,
      ratingBefore: before,
      ratingAfter: after,
      rankInSession: rank,
      sessionReturn: p.sessionReturn,
    });
  }
}

async function computeSessionReturns(
  db: Database,
  sessionId: string,
  agentIds: string[],
): Promise<Participant[]> {
  const out: Participant[] = [];
  for (const agentId of agentIds) {
    const snaps = await db.query.netWorthSnapshots.findMany({
      where: eq(netWorthSnapshots.agentId, agentId),
      orderBy: desc(netWorthSnapshots.createdAt),
      limit: 5,
    });
    const current = snaps.find((s) => s.sessionId === sessionId);
    if (!current) continue;
    const prior = snaps.find((s) => s.sessionId !== sessionId);
    const sessionReturn =
      prior && prior.netWorth > 0 ? (current.netWorth - prior.netWorth) / prior.netWorth : 0;
    out.push({ agentId, sessionReturn });
  }
  return out;
}
