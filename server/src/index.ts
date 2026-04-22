import { Hono } from "hono";
import { assetRoutes } from "./routes/assets";
import { agentRoutes } from "./routes/agents";
import { orderRoutes } from "./routes/orders";
import { sessionRoutes } from "./routes/sessions";
import { leaderboardRoutes } from "./routes/leaderboard";
import { providerRoutes } from "./routes/providers";
import { runHealthChecks } from "./services/llm";

type Bindings = {
  DB: D1Database;
  GROQ_API_KEY: string;
  CEREBRAS_API_KEY: string;
  OPENROUTER_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("Trading Arena API"));

app.route("/api/assets", assetRoutes);
app.route("/api/agents", agentRoutes);
app.route("/api/orders", orderRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/leaderboard", leaderboardRoutes);
app.route("/api/providers", providerRoutes);

export default app;

export const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (
  _event,
  env,
) => {
  await runHealthChecks(env);
};
