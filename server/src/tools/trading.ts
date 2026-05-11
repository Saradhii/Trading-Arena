import { eq, and } from "drizzle-orm";
import type { Database } from "../db";
import { aiAgents, assets, holdings, orders, netWorthSnapshots } from "../db/schema";

export async function getPortfolio(db: Database, agentId: string) {
  const agent = await db.query.aiAgents.findFirst({
    where: eq(aiAgents.id, agentId),
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
    agentId: agent.id,
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
  return db.query.assets.findMany({ where: eq(assets.enabled, true) });
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
    where: eq(aiAgents.id, agentId),
  });
  if (!agent) throw new Error("Agent not found");

  const asset = await db.query.assets.findFirst({
    where: eq(assets.symbol, assetSymbol.toUpperCase()),
  });
  if (!asset) throw new Error(`Asset ${assetSymbol} not found`);

  const totalCost = quantity * asset.currentPrice;
  if (agent.cashBalance < totalCost) throw new Error("Insufficient funds");

  await db.update(aiAgents).set({ cashBalance: agent.cashBalance - totalCost }).where(eq(aiAgents.id, agent.id));

  const existingHolding = await db.query.holdings.findFirst({
    where: and(eq(holdings.agentId, agent.id), eq(holdings.assetId, asset.id)),
  });

  if (existingHolding) {
    const newQuantity = existingHolding.quantity + quantity;
    const newAvgPrice =
      (existingHolding.averageBuyPrice * existingHolding.quantity + asset.currentPrice * quantity) / newQuantity;
    await db
      .update(holdings)
      .set({ quantity: newQuantity, averageBuyPrice: newAvgPrice })
      .where(eq(holdings.id, existingHolding.id));
  } else {
    await db.insert(holdings).values({
      id: crypto.randomUUID(),
      agentId: agent.id,
      assetId: asset.id,
      quantity,
      averageBuyPrice: asset.currentPrice,
    });
  }

  const order = await db
    .insert(orders)
    .values({
      id: crypto.randomUUID(),
      agentId: agent.id,
      assetId: asset.id,
      sessionId,
      orderType: "market_buy",
      quantity,
      priceAtOrder: asset.currentPrice,
      reasoning,
    })
    .returning();

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
    where: eq(aiAgents.id, agentId),
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
  if (newQuantity < 1e-10) {
    await db.delete(holdings).where(eq(holdings.id, holding.id));
  } else {
    await db.update(holdings).set({ quantity: newQuantity }).where(eq(holdings.id, holding.id));
  }

  const order = await db
    .insert(orders)
    .values({
      id: crypto.randomUUID(),
      agentId: agent.id,
      assetId: asset.id,
      sessionId,
      orderType: "market_sell",
      quantity,
      priceAtOrder: asset.currentPrice,
      reasoning,
    })
    .returning();

  return order;
}

export async function snapshotNetWorth(db: Database, agentId: string, sessionId: string) {
  const portfolio = await getPortfolio(db, agentId);

  await db.insert(netWorthSnapshots).values({
    id: crypto.randomUUID(),
    agentId,
    sessionId,
    cashBalance: portfolio.cashBalance,
    portfolioValue: portfolio.portfolioValue,
    netWorth: portfolio.netWorth,
  });

  return portfolio.netWorth;
}
