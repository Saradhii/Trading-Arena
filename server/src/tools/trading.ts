import { eq, and, sql } from "drizzle-orm";
import type { Database } from "../db";
import { aiAgents, assets, holdings, orders, netWorthSnapshots, tradingSessions } from "../db/schema";

export async function getPortfolio(db: Database, agentId: string) {
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, agentId),
  });
  if (!agent) throw new Error("Agent not found");

  const agentHoldings = await db.query.holdings.findMany({
    where: eq(holdings.agentId, agent.id),
    with: { asset: true },
  });

  let portfolioValue = 0;
  const holdingsWithValues = agentHoldings.map((h) => {
    const currentValue = h.quantity * h.asset.currentPrice;
    portfolioValue += currentValue;
    return {
      symbol: h.asset.symbol,
      name: h.asset.name,
      quantity: h.quantity,
      averageBuyPrice: h.averageBuyPrice,
      currentPrice: h.asset.currentPrice,
      currentValue,
      pnl: currentValue - h.quantity * h.averageBuyPrice,
    };
  });

  return {
    agentId: agent.agentId,
    agentName: agent.agentName,
    cashBalance: agent.cashBalance,
    portfolioValue,
    netWorth: agent.cashBalance + portfolioValue,
    holdings: holdingsWithValues,
  };
}

export async function getAssetPrice(db: Database, symbol: string) {
  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, symbol.toUpperCase()),
  });
  if (!asset) throw new Error(`Asset ${symbol} not found`);
  return asset;
}

export async function getMarketOverview(db: Database) {
  return db.query.assets.findMany();
}

export async function getOtherAgentsActions(db: Database, agentId: string, sessionId: string) {
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, agentId),
  });
  if (!agent) throw new Error("Agent not found");

  const lastSession = sessionId
    ? await db.query.tradingSessions.findFirst({
        where: eq(tradingSessions.id, sessionId),
      })
    : await db.query.tradingSessions.findFirst({
        orderBy: sql`${tradingSessions.sessionNumber} DESC`,
      });

  if (!lastSession) return [];

  return db.query.orders.findMany({
    where: and(
      eq(orders.sessionId, lastSession.id),
      sql`${orders.agentId} != ${agent.id}`
    ),
    with: { agent: true, asset: true },
  });
}

export async function marketBuy(
  db: Database,
  agentId: string,
  assetSymbol: string,
  quantity: number,
  reasoning: string,
  sessionId: string
) {
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, agentId),
  });
  if (!agent) throw new Error("Agent not found");

  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, assetSymbol.toUpperCase()),
  });
  if (!asset) throw new Error(`Asset ${assetSymbol} not found`);

  const totalCost = quantity * asset.currentPrice;
  if (agent.cashBalance < totalCost) throw new Error("Insufficient funds");
  if (agent.cashBalance - totalCost < 0) throw new Error("Net worth would go below $0");

  const agentDbId = agent.id;

  await db.update(aiAgents).set({ cashBalance: agent.cashBalance - totalCost }).where(eq(aiAgents.id, agentDbId));

  const existingHolding = await db.query.holdings.findFirst({
    where: and(eq(holdings.agentId, agentDbId), eq(holdings.assetId, asset.id)),
  });

  if (existingHolding) {
    const newQuantity = existingHolding.quantity + quantity;
    const newAvgPrice = (existingHolding.averageBuyPrice * existingHolding.quantity + asset.currentPrice * quantity) / newQuantity;
    await db
      .update(holdings)
      .set({ quantity: newQuantity, averageBuyPrice: newAvgPrice, updatedAt: new Date() })
      .where(eq(holdings.id, existingHolding.id));
  } else {
    await db.insert(holdings).values({
      id: crypto.randomUUID(),
      agentId: agentDbId,
      assetId: asset.id,
      quantity,
      averageBuyPrice: asset.currentPrice,
    });
  }

  const order = await db.insert(orders).values({
    id: crypto.randomUUID(),
    agentId: agentDbId,
    assetId: asset.id,
    sessionId,
    orderType: "market_buy",
    quantity,
    priceAtOrder: asset.currentPrice,
    status: "executed",
    reasoning,
    executedAt: new Date(),
  }).returning();

  return order;
}

export async function marketSell(
  db: Database,
  agentId: string,
  assetSymbol: string,
  quantity: number,
  reasoning: string,
  sessionId: string
) {
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, agentId),
  });
  if (!agent) throw new Error("Agent not found");

  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, assetSymbol.toUpperCase()),
  });
  if (!asset) throw new Error(`Asset ${assetSymbol} not found`);

  const holding = await db.query.holdings.findFirst({
    where: and(eq(holdings.agentId, agent.id), eq(holdings.assetId, asset.id)),
  });
  if (!holding || holding.quantity < quantity) throw new Error("Insufficient holdings");

  const totalValue = quantity * asset.currentPrice;

  await db.update(aiAgents).set({ cashBalance: agent.cashBalance + totalValue }).where(eq(aiAgents.id, agent.id));

  const newQuantity = holding.quantity - quantity;
  if (newQuantity === 0) {
    await db.delete(holdings).where(eq(holdings.id, holding.id));
  } else {
    await db.update(holdings).set({ quantity: newQuantity, updatedAt: new Date() }).where(eq(holdings.id, holding.id));
  }

  const order = await db.insert(orders).values({
    id: crypto.randomUUID(),
    agentId: agent.id,
    assetId: asset.id,
    sessionId,
    orderType: "market_sell",
    quantity,
    priceAtOrder: asset.currentPrice,
    status: "executed",
    reasoning,
    executedAt: new Date(),
  }).returning();

  return order;
}

export async function limitBuy(
  db: Database,
  agentId: string,
  assetSymbol: string,
  quantity: number,
  targetPrice: number,
  reasoning: string,
  sessionId: string
) {
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, agentId),
  });
  if (!agent) throw new Error("Agent not found");

  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, assetSymbol.toUpperCase()),
  });
  if (!asset) throw new Error(`Asset ${assetSymbol} not found`);

  if (agent.cashBalance < quantity * targetPrice) throw new Error("Insufficient funds for limit order");

  const order = await db.insert(orders).values({
    id: crypto.randomUUID(),
    agentId: agent.id,
    assetId: asset.id,
    sessionId,
    orderType: "limit_buy",
    quantity,
    priceAtOrder: asset.currentPrice,
    targetPrice,
    status: "pending",
    reasoning,
  }).returning();

  return order;
}

export async function limitSell(
  db: Database,
  agentId: string,
  assetSymbol: string,
  quantity: number,
  targetPrice: number,
  reasoning: string,
  sessionId: string
) {
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, agentId),
  });
  if (!agent) throw new Error("Agent not found");

  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, assetSymbol.toUpperCase()),
  });
  if (!asset) throw new Error(`Asset ${assetSymbol} not found`);

  const holding = await db.query.holdings.findFirst({
    where: and(eq(holdings.agentId, agent.id), eq(holdings.assetId, asset.id)),
  });
  if (!holding || holding.quantity < quantity) throw new Error("Insufficient holdings for limit order");

  const order = await db.insert(orders).values({
    id: crypto.randomUUID(),
    agentId: agent.id,
    assetId: asset.id,
    sessionId,
    orderType: "limit_sell",
    quantity,
    priceAtOrder: asset.currentPrice,
    targetPrice,
    status: "pending",
    reasoning,
  }).returning();

  return order;
}

export async function executePendingLimitOrders(db: Database, sessionId: string) {
  const pendingOrders = await db.query.orders.findMany({
    where: and(eq(orders.status, "pending"), eq(orders.sessionId, sessionId)),
    with: { asset: true },
  });

  const executed = [];

  for (const order of pendingOrders) {
    const currentPrice = order.asset.currentPrice;
    let shouldExecute = false;

    if (order.orderType === "limit_buy" && currentPrice <= (order.targetPrice ?? 0)) {
      shouldExecute = true;
    }
    if (order.orderType === "limit_sell" && currentPrice >= (order.targetPrice ?? Infinity)) {
      shouldExecute = true;
    }

    if (shouldExecute) {
      if (order.orderType === "limit_buy") {
        await marketBuy(db, (await db.query.aiAgents.findFirst({ where: eq(aiAgents.id, order.agentId) }))!.agentId, order.asset.symbol, order.quantity, order.reasoning ?? "Limit order executed", sessionId);
        await db.update(orders).set({ status: "executed", executedAt: new Date() }).where(eq(orders.id, order.id));
      } else {
        await marketSell(db, (await db.query.aiAgents.findFirst({ where: eq(aiAgents.id, order.agentId) }))!.agentId, order.asset.symbol, order.quantity, order.reasoning ?? "Limit order executed", sessionId);
        await db.update(orders).set({ status: "executed", executedAt: new Date() }).where(eq(orders.id, order.id));
      }
      executed.push(order.id);
    }
  }

  return { executed: executed.length, orderIds: executed };
}

export async function snapshotNetWorth(db: Database, agentId: string, sessionId: string) {
  const portfolio = await getPortfolio(db, agentId);
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.agentId, agentId),
  });
  if (!agent) throw new Error("Agent not found");

  await db.insert(netWorthSnapshots).values({
    id: crypto.randomUUID(),
    agentId: agent.id,
    sessionId,
    cashBalance: portfolio.cashBalance,
    portfolioValue: portfolio.portfolioValue,
    netWorth: portfolio.netWorth,
  });

  return portfolio.netWorth;
}
