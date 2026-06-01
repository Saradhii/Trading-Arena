import { eq, desc } from "drizzle-orm";
import type { Database } from "../db";
import { tradingSessions, orders } from "../db/schema";
import type { AgentContext } from "./agents/types";

export type OrderFlow = NonNullable<AgentContext["orderFlow"]>;

export async function getLastSessionOrderFlow(
  db: Database,
  excludeSessionId?: string,
): Promise<OrderFlow | undefined> {
  const recent = await db.query.tradingSessions.findMany({
    where: eq(tradingSessions.status, "completed"),
    orderBy: desc(tradingSessions.sessionNumber),
    limit: 2,
  });
  const session = recent.find((s) => s.id !== excludeSessionId);
  if (!session) return undefined;

  const sessionOrders = await db.query.orders.findMany({
    where: eq(orders.sessionId, session.id),
    with: { asset: true },
  });

  const bySymbol: OrderFlow["bySymbol"] = {};
  for (const o of sessionOrders) {
    const symbol = (o as { asset?: { symbol: string } }).asset?.symbol;
    if (!symbol) continue;
    const entry = (bySymbol[symbol] ??= {
      buyUnits: 0,
      sellUnits: 0,
      buyOrders: 0,
      sellOrders: 0,
    });
    if (o.orderType === "market_buy") {
      entry.buyUnits += o.quantity;
      entry.buyOrders += 1;
    } else {
      entry.sellUnits += o.quantity;
      entry.sellOrders += 1;
    }
  }

  return { sessionNumber: session.sessionNumber, bySymbol };
}
