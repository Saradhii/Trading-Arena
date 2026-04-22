import { Hono } from "hono";
import { assetRoutes } from "./routes/assets";
import { agentRoutes } from "./routes/agents";
import { orderRoutes } from "./routes/orders";
import { sessionRoutes } from "./routes/sessions";
import { leaderboardRoutes } from "./routes/leaderboard";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("Trading Arena API"));

app.route("/api/assets", assetRoutes);
app.route("/api/agents", agentRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/leaderboard", leaderboardRoutes);

export default app;
