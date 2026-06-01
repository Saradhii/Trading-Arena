import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
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

  adapterType: text("adapter_type").notNull().default("llm"),

  adapterConfig: text("adapter_config"),

  memoryEnabled: integer("memory_enabled", { mode: "boolean" }).notNull().default(false),

  strategyPersona: text("strategy_persona"),
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
    logoUrl: text("logo_url"),
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

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id").notNull().references(() => assets.id),
    symbol: text("symbol").notNull(),
    price: real("price").notNull(),

    sessionId: text("session_id").references(() => tradingSessions.id),
    recordedAt: integer("recorded_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    assetIdx: index("price_history_asset_idx").on(t.assetId),
    assetRecordedIdx: index("price_history_asset_recorded_idx").on(t.assetId, t.recordedAt),
    sessionIdx: index("price_history_session_idx").on(t.sessionId),
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

  effectivePrice: real("effective_price"),
  feePaid: real("fee_paid").default(0),
  slippageBps: real("slippage_bps").default(0),
  reasoning: text("reasoning"),
  executedAt: integer("executed_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
}, (t) => ({
  agentIdx: index("orders_agent_idx").on(t.agentId),
  assetIdx: index("orders_asset_idx").on(t.assetId),
  sessionIdx: index("orders_session_idx").on(t.sessionId),
  createdAtIdx: index("orders_created_at_idx").on(t.createdAt),
}));

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
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
}, (t) => ({
  agentAssetIdx: index("holdings_agent_asset_idx").on(t.agentId, t.assetId),
}));

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
}, (t) => ({
  agentIdx: index("net_worth_snapshots_agent_idx").on(t.agentId),
}));

export const agentDecisions = sqliteTable(
  "agent_decisions",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => tradingSessions.id),
    agentId: text("agent_id").notNull().references(() => aiAgents.id),
    decisionType: text("decision_type", { enum: ["trade", "hold", "error"] }).notNull(),
    reasoning: text("reasoning"),

    confidence: real("confidence"),
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

export const seasons = sqliteTable("seasons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startSession: integer("start_session").notNull(),
  endSession: integer("end_session"),
  status: text("status", { enum: ["active", "completed"] }).notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date()),
});

export const agentRatings = sqliteTable("agent_ratings", {
  agentId: text("agent_id").primaryKey().references(() => aiAgents.id),
  rating: real("rating").notNull().default(1200),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export const ratingHistory = sqliteTable(
  "rating_history",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull().references(() => aiAgents.id),
    sessionId: text("session_id").notNull().references(() => tradingSessions.id),
    ratingBefore: real("rating_before").notNull(),
    ratingAfter: real("rating_after").notNull(),
    rankInSession: integer("rank_in_session").notNull(),
    sessionReturn: real("session_return"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    agentIdx: index("rating_history_agent_idx").on(t.agentId),
    sessionIdx: index("rating_history_session_idx").on(t.sessionId),
  }),
);

export const agentMemory = sqliteTable(
  "agent_memory",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").notNull().references(() => aiAgents.id),
    sessionId: text("session_id").references(() => tradingSessions.id),

    memoryType: text("memory_type").notNull(),
    content: text("content").notNull(),
    importance: real("importance").notNull().default(0.5),
    sessionNumber: integer("session_number"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`)
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    agentIdx: index("agent_memory_agent_idx").on(t.agentId),
    agentTypeIdx: index("agent_memory_agent_type_idx").on(t.agentId, t.memoryType),
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
}, (t) => ({
  sessionIdx: index("session_logs_session_idx").on(t.sessionId),
  createdAtIdx: index("session_logs_created_at_idx").on(t.createdAt),
}));
