import { relations } from "drizzle-orm";
import {
  agentDecisions,
  agentMemory,
  aiAgents,
  assets,
  holdings,
  netWorthSnapshots,
  orders,
  priceHistory,
  ratingHistory,
  sessionLogs,
  tradingSessions,
} from "./schema";

export const aiAgentsRelations = relations(aiAgents, ({ many }) => ({
  holdings: many(holdings),
  orders: many(orders),
  snapshots: many(netWorthSnapshots),
  decisions: many(agentDecisions),
  sessionLogs: many(sessionLogs),
  memory: many(agentMemory),
}));

export const agentMemoryRelations = relations(agentMemory, ({ one }) => ({
  agent: one(aiAgents, { fields: [agentMemory.agentId], references: [aiAgents.id] }),
  session: one(tradingSessions, { fields: [agentMemory.sessionId], references: [tradingSessions.id] }),
}));

export const ratingHistoryRelations = relations(ratingHistory, ({ one }) => ({
  agent: one(aiAgents, { fields: [ratingHistory.agentId], references: [aiAgents.id] }),
  session: one(tradingSessions, { fields: [ratingHistory.sessionId], references: [tradingSessions.id] }),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  holdings: many(holdings),
  orders: many(orders),
  priceHistory: many(priceHistory),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  asset: one(assets, { fields: [priceHistory.assetId], references: [assets.id] }),
  session: one(tradingSessions, { fields: [priceHistory.sessionId], references: [tradingSessions.id] }),
}));

export const tradingSessionsRelations = relations(tradingSessions, ({ many }) => ({
  orders: many(orders),
  snapshots: many(netWorthSnapshots),
  decisions: many(agentDecisions),
  sessionLogs: many(sessionLogs),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  asset: one(assets, { fields: [orders.assetId], references: [assets.id] }),
  agent: one(aiAgents, { fields: [orders.agentId], references: [aiAgents.id] }),
  session: one(tradingSessions, { fields: [orders.sessionId], references: [tradingSessions.id] }),
}));

export const holdingsRelations = relations(holdings, ({ one }) => ({
  asset: one(assets, { fields: [holdings.assetId], references: [assets.id] }),
  agent: one(aiAgents, { fields: [holdings.agentId], references: [aiAgents.id] }),
}));

export const netWorthSnapshotsRelations = relations(netWorthSnapshots, ({ one }) => ({
  agent: one(aiAgents, { fields: [netWorthSnapshots.agentId], references: [aiAgents.id] }),
  session: one(tradingSessions, { fields: [netWorthSnapshots.sessionId], references: [tradingSessions.id] }),
}));

export const agentDecisionsRelations = relations(agentDecisions, ({ one }) => ({
  agent: one(aiAgents, { fields: [agentDecisions.agentId], references: [aiAgents.id] }),
  session: one(tradingSessions, { fields: [agentDecisions.sessionId], references: [tradingSessions.id] }),
}));

export const sessionLogsRelations = relations(sessionLogs, ({ one }) => ({
  session: one(tradingSessions, { fields: [sessionLogs.sessionId], references: [tradingSessions.id] }),
  agent: one(aiAgents, { fields: [sessionLogs.agentId], references: [aiAgents.id] }),
}));
