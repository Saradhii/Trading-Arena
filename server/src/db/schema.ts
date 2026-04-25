import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const tradingSessions = sqliteTable("trading_sessions", {
  id: text("id").primaryKey(),
  sessionNumber: integer("session_number").notNull(),
  status: text("status", { enum: ["running", "completed"] }).notNull().default("running"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const aiAgents = sqliteTable("ai_agents", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().unique(),
  agentName: text("agent_name").notNull(),
  parametersCount: text("parameters_count"),
  releaseDate: text("release_date"),
  parentCompany: text("parent_company"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  cashBalance: real("cash_balance").notNull().default(100000),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  assetType: text("asset_type", { enum: ["crypto", "stock"] }).notNull(),
  currentPrice: real("current_price").notNull(),
  lastUpdated: integer("last_updated", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => aiAgents.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  sessionId: text("session_id").notNull().references(() => tradingSessions.id),
  orderType: text("order_type", { enum: ["market_buy", "market_sell", "limit_buy", "limit_sell"] }).notNull(),
  quantity: real("quantity").notNull(),
  priceAtOrder: real("price_at_order").notNull(),
  targetPrice: real("target_price"),
  status: text("status", { enum: ["pending", "executed", "cancelled"] }).notNull().default("pending"),
  reasoning: text("reasoning"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  executedAt: integer("executed_at", { mode: "timestamp" }),
});

export const holdings = sqliteTable("holdings", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => aiAgents.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  quantity: real("quantity").notNull(),
  averageBuyPrice: real("average_buy_price").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const netWorthSnapshots = sqliteTable("net_worth_snapshots", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => aiAgents.id),
  sessionId: text("session_id").notNull().references(() => tradingSessions.id),
  cashBalance: real("cash_balance").notNull(),
  portfolioValue: real("portfolio_value").notNull(),
  netWorth: real("net_worth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const holdingsRelations = relations(holdings, ({ one }) => ({
  asset: one(assets, { fields: [holdings.assetId], references: [assets.id] }),
  agent: one(aiAgents, { fields: [holdings.agentId], references: [aiAgents.id] }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  asset: one(assets, { fields: [orders.assetId], references: [assets.id] }),
  agent: one(aiAgents, { fields: [orders.agentId], references: [aiAgents.id] }),
  session: one(tradingSessions, { fields: [orders.sessionId], references: [tradingSessions.id] }),
}));

export const netWorthSnapshotsRelations = relations(netWorthSnapshots, ({ one }) => ({
  agent: one(aiAgents, { fields: [netWorthSnapshots.agentId], references: [aiAgents.id] }),
  session: one(tradingSessions, { fields: [netWorthSnapshots.sessionId], references: [tradingSessions.id] }),
}));

export const aiAgentsRelations = relations(aiAgents, ({ many }) => ({
  holdings: many(holdings),
  orders: many(orders),
  snapshots: many(netWorthSnapshots),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  holdings: many(holdings),
  orders: many(orders),
}));

export const tradingSessionsRelations = relations(tradingSessions, ({ many }) => ({
  orders: many(orders),
  snapshots: many(netWorthSnapshots),
  sessionLogs: many(sessionLogs),
}));

export const cryptos = sqliteTable("cryptos", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  externalId: text("external_id").notNull().unique(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const stocks = sqliteTable("stocks", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  externalId: text("external_id").notNull().unique(),
  exchange: text("exchange").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const sessionLogs = sqliteTable("session_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").references(() => tradingSessions.id),
  agentId: text("agent_id").references(() => aiAgents.id),
  providerUsed: text("provider_used").notNull(),
  modelUsed: text("model_used").notNull(),
  status: text("status", { enum: ["success", "skipped", "failed"] }).notNull(),
  failureReason: text("failure_reason"),
  toolCallsMade: integer("tool_calls_made").default(0),
  tokensUsed: integer("tokens_used"),
  latencyMs: integer("latency_ms"),
  rateLimitRemaining: integer("rate_limit_remaining"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const sessionLogsRelations = relations(sessionLogs, ({ one }) => ({
  session: one(tradingSessions, { fields: [sessionLogs.sessionId], references: [tradingSessions.id] }),
  agent: one(aiAgents, { fields: [sessionLogs.agentId], references: [aiAgents.id] }),
}));
