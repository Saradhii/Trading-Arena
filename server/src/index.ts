import { Hono } from "hono";
import { cors } from "hono/cors";
import { assetRoutes } from "./routes/assets";
import { agentRoutes } from "./routes/agents";
import { orderRoutes } from "./routes/orders";
import { sessionRoutes } from "./routes/sessions";
import { leaderboardRoutes } from "./routes/leaderboard";
import { tradingSessionRoutes } from "./routes/trading-session";
import { dashboardRoutes } from "./routes/dashboard";
import { providerRoutes } from "./routes/providers";
import { runTradingSession } from "./services/trading-session";
import { dbMiddleware, AppType } from "./middleware";

const app = new Hono<AppType>();

app.use("/api/*", cors());
app.use("/api/*", dbMiddleware);

app.get("/", (c) => c.text("Trading Arena API"));

app.route("/api/assets", assetRoutes);
app.route("/api/agents", agentRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/leaderboard", leaderboardRoutes);
app.route("/api/trading-session", tradingSessionRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/providers", providerRoutes);

export default {
  fetch: app.fetch,
  scheduled: async (_event, env) => {
    await runTradingSession(env);
  },
} satisfies ExportedHandler<import("./env").Env>;
