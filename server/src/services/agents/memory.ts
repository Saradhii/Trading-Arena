import { eq, and, desc } from "drizzle-orm";
import type { Database } from "../../db";
import { agentMemory, netWorthSnapshots } from "../../db/schema";
import { chatWithTools } from "../llm";
import type { Env } from "../llm/types";

export interface RetrievedMemory {
  reflections: Array<{ sessionNumber: number; content: string }>;
  lessons: string[];
}

export async function retrieveMemory(
  db: Database,
  agentId: string,
  opts: { reflections?: number; lessons?: number } = {},
): Promise<RetrievedMemory> {
  const reflectionLimit = opts.reflections ?? 5;
  const lessonLimit = opts.lessons ?? 3;

  const reflectionRows = await db.query.agentMemory.findMany({
    where: and(eq(agentMemory.agentId, agentId), eq(agentMemory.memoryType, "reflection")),
    orderBy: desc(agentMemory.createdAt),
    limit: reflectionLimit,
  });

  const lessonRows = await db.query.agentMemory.findMany({
    where: and(eq(agentMemory.agentId, agentId), eq(agentMemory.memoryType, "lesson")),
    orderBy: desc(agentMemory.importance),
    limit: lessonLimit,
  });

  return {
    reflections: reflectionRows
      .map((r) => ({ sessionNumber: r.sessionNumber ?? 0, content: r.content }))
      .reverse(),
    lessons: lessonRows.map((l) => l.content),
  };
}

export async function recordReflection(
  db: Database,
  env: Env,
  agentId: string,
  sessionId: string,
  sessionNumber: number,
  params: {
    decisionType: string;
    reasoning: string | null;
    trades: Array<{ action: string; asset: string; quantity: number }>;
  },
): Promise<void> {
  try {
    const prevNetWorth = await previousNetWorth(db, agentId, sessionId);
    const currentNetWorth = await latestNetWorth(db, agentId, sessionId);
    const delta =
      prevNetWorth !== null && currentNetWorth !== null ? currentNetWorth - prevNetWorth : null;

    const tradeStr =
      params.trades.length > 0
        ? params.trades.map((t) => `${t.action} ${t.quantity} ${t.asset}`).join(", ")
        : "held (no trades)";

    const deltaStr =
      delta === null
        ? "unknown (no prior snapshot)"
        : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`;

    const reflectionPrompt = `You just completed session #${sessionNumber}.
Decision: ${params.decisionType} — ${tradeStr}.
Your stated reasoning was: ${params.reasoning ?? "(none)"}
Net-worth change since last session: ${deltaStr}.

In 2-3 sentences, reflect honestly:
1. Was your thesis playing out?
2. What, if anything, would you do differently?
3. One concrete lesson to carry forward.`;

    const response = await chatWithTools(
      env,
      agentId,
      [
        {
          role: "system",
          content:
            "You are reflecting on your own trading performance. Be specific and honest; avoid generic filler.",
        },
        { role: "user", content: reflectionPrompt },
      ],
      [],
    );

    const content = response.content?.trim();
    if (!content) return;

    await db.insert(agentMemory).values({
      id: crypto.randomUUID(),
      agentId,
      sessionId,
      memoryType: "reflection",
      content,
      importance: 0.5,
      sessionNumber,
    });
  } catch (err) {
    console.warn(
      `[memory] reflection failed agent=${agentId} session=${sessionId} reason=${err instanceof Error ? err.message : "unknown"}`,
    );
  }
}

async function latestNetWorth(
  db: Database,
  agentId: string,
  sessionId: string,
): Promise<number | null> {
  const [row] = await db.query.netWorthSnapshots.findMany({
    where: and(
      eq(netWorthSnapshots.agentId, agentId),
      eq(netWorthSnapshots.sessionId, sessionId),
    ),
    limit: 1,
  });
  return row?.netWorth ?? null;
}

async function previousNetWorth(
  db: Database,
  agentId: string,
  sessionId: string,
): Promise<number | null> {
  const rows = await db.query.netWorthSnapshots.findMany({
    where: eq(netWorthSnapshots.agentId, agentId),
    orderBy: desc(netWorthSnapshots.createdAt),
    limit: 5,
  });

  const prior = rows.find((r) => r.sessionId !== sessionId);
  return prior?.netWorth ?? null;
}
