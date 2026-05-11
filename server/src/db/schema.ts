import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tradingSessions = sqliteTable("trading_sessions", {
  id: text("id").primaryKey(),
  sessionNumber: integer("session_number").notNull(),
  status: text("status", { enum: ["running", "completed"] }).notNull().default("running"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const aiAgents = sqliteTable("ai_agents", {
  id: text("id").primaryKey(),
  agentName: text("agent_name").notNull(),
  parametersCount: text("parameters_count"),
  releaseDate: text("release_date"),
  parentCompany: text("parent_company"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  cashBalance: real("cash_balance").notNull().default(100000),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    assetType: text("asset_type", { enum: ["crypto", "stock"] }).notNull(),
    externalId: text("external_id").notNull(),
    exchange: text("exchange"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    currentPrice: real("current_price").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    symbolTypeUniq: uniqueIndex("assets_symbol_type_uniq").on(t.symbol, t.assetType),
  }),
);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => aiAgents.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  sessionId: text("session_id").notNull().references(() => tradingSessions.id),
  orderType: text("order_type", { enum: ["market_buy", "market_sell"] }).notNull(),
  quantity: real("quantity").notNull(),
  priceAtOrder: real("price_at_order").notNull(),
  reasoning: text("reasoning"),
  executedAt: integer("executed_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const holdings = sqliteTable("holdings", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => aiAgents.id),
  assetId: text("asset_id").notNull().references(() => assets.id),
  quantity: real("quantity").notNull(),
  averageBuyPrice: real("average_buy_price").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const netWorthSnapshots = sqliteTable("net_worth_snapshots", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => aiAgents.id),
  sessionId: text("session_id").notNull().references(() => tradingSessions.id),
  cashBalance: real("cash_balance").notNull(),
  portfolioValue: real("portfolio_value").notNull(),
  netWorth: real("net_worth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const agentDecisions = sqliteTable(
  "agent_decisions",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => tradingSessions.id),
    agentId: text("agent_id").notNull().references(() => aiAgents.id),
    decisionType: text("decision_type", { enum: ["trade", "hold", "error"] }).notNull(),
    reasoning: text("reasoning"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    sessionAgentUniq: uniqueIndex("agent_decisions_session_agent_uniq").on(t.sessionId, t.agentId),
  }),
);

export const sessionLogs = sqliteTable("session_logs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => tradingSessions.id),
  agentId: text("agent_id").notNull().references(() => aiAgents.id),
  providerUsed: text("provider_used").notNull(),
  modelUsed: text("model_used").notNull(),
  status: text("status", { enum: ["success", "skipped", "failed"] }).notNull(),
  failureReason: text("failure_reason"),
  toolCallsMade: integer("tool_calls_made").default(0),
  tokensUsed: integer("tokens_used"),
  latencyMs: integer("latency_ms"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});
