import { Hono } from "hono";
import { AppType } from "../middleware";
import { backtestBaselinesFromHistory } from "../services/backtest";

export const backtestRoutes = new Hono<AppType>();

backtestRoutes.get("/baselines", async (c) => {
  const db = c.get("db");
  const result = await backtestBaselinesFromHistory(db);
  return c.json(result);
});

export default backtestRoutes;
