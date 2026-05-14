import { eq } from "drizzle-orm";
import type { Database } from "./db";
import { aiAgents, assets } from "./db/schema";

export async function getAgentById(db: Database, id: string) {
  return db.query.aiAgents.findFirst({
    where: eq(aiAgents.id, id),
  });
}

export async function getAgentByIdOrThrow(db: Database, id: string) {
  const agent = await getAgentById(db, id);
  if (!agent) throw new Error(ERRORS.AGENT_NOT_FOUND);
  return agent;
}

export async function getAssetBySymbol(db: Database, symbol: string) {
  return db.query.assets.findFirst({
    where: eq(assets.symbol, symbol.toUpperCase()),
  });
}

export async function getAssetBySymbolOrThrow(db: Database, symbol: string) {
  const asset = await getAssetBySymbol(db, symbol);
  if (!asset) throw new Error(ERRORS.assetNotFound(symbol));
  return asset;
}

export const ERRORS = {
  AGENT_NOT_FOUND: "Agent not found",
  ASSET_NOT_FOUND: "Asset not found",
  SESSION_NOT_FOUND: "Session not found",
  assetNotFound: (symbol: string) => `Asset ${symbol} not found`,
} as const;
