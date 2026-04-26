import { Hono } from "hono";
import { cors } from "hono/cors";
import { assetRoutes } from "./routes/assets";
import { agentRoutes } from "./routes/agents";
import { orderRoutes } from "./routes/orders";
import { sessionRoutes } from "./routes/sessions";
import { leaderboardRoutes } from "./routes/leaderboard";
import { tradingSessionRoutes } from "./routes/trading-session";
import { dashboardRoutes } from "./routes/dashboard";
import { runTradingSession } from "./services/trading-session";

type Bindings = {
  DB: D1Database;
  GROQ_API_KEY: string;
  CEREBRAS_API_KEY: string;
  OPENROUTER_API_KEY: string;
  FINNHUB_API_KEY: string;
  ZAI_API_KEY: string;
  GOOGLE_API_KEY: string;
  COINGECKO_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors());

app.get("/", (c) => c.text("Trading Arena API"));

app.route("/api/assets", assetRoutes);
app.route("/api/agents", agentRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/leaderboard", leaderboardRoutes);
app.route("/api/trading-session", tradingSessionRoutes);
app.route("/api/dashboard", dashboardRoutes);

export default {
  fetch: app.fetch,
  scheduled: async (_event, env) => {
    await runTradingSession(env);
  },
} satisfies ExportedHandler<Bindings>;
