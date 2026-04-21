import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const contests = sqliteTable("contests", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["upcoming", "active", "completed", "cancelled"],
  })
    .notNull()
    .default("upcoming"),
  entryFee: real("entry_fee").notNull().default(0),
  prizePool: real("prize_pool").notNull().default(0),
  maxParticipants: integer("max_participants").notNull().default(100),
  startedAt: integer("started_at", { mode: "timestamp" }),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const contestParticipants = sqliteTable("contest_participants", {
  id: text("id").primaryKey(),
  contestId: text("contest_id")
    .notNull()
    .references(() => contests.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  joinedAt: integer("joined_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const trades = sqliteTable("trades", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  contestId: text("contest_id")
    .notNull()
    .references(() => contests.id),
  symbol: text("symbol").notNull(),
  side: text("side", { enum: ["buy", "sell"] }).notNull(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  totalValue: real("total_value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const portfolios = sqliteTable("portfolios", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  contestId: text("contest_id")
    .notNull()
    .references(() => contests.id),
  symbol: text("symbol").notNull(),
  quantity: real("quantity").notNull(),
  averagePrice: real("average_price").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const leaderboard = sqliteTable("leaderboard", {
  id: text("id").primaryKey(),
  contestId: text("contest_id")
    .notNull()
    .references(() => contests.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  rank: integer("rank").notNull(),
  totalPnl: real("total_pnl").notNull().default(0),
  portfolioValue: real("portfolio_value").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
