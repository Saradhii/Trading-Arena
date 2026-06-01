import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { ratingHistory } from "../db/schema";
import { AppType } from "../middleware";
import { getAgentById, ERRORS } from "../helpers";
import { getAgentAnalytics } from "../services/scoring/analytics";
import { getAgentAudit } from "../services/scoring/audit";

export const analyticsRoutes = new Hono<AppType>();

analyticsRoutes.get("/", async (c) => {
  const db = c.get("db");
  const analytics = await getAgentAnalytics(db);
  return c.json(analytics);
});

analyticsRoutes.get("/audit", async (c) => {
  const db = c.get("db");
  const audit = await getAgentAudit(db);
  return c.json(audit);
});

analyticsRoutes.get("/ratings/:id", async (c) => {
  const db = c.get("db");
  const agent = await getAgentById(db, c.req.param("id"));
  if (!agent) return c.json({ error: ERRORS.AGENT_NOT_FOUND }, 404);

  const history = await db.query.ratingHistory.findMany({
    where: eq(ratingHistory.agentId, agent.id),
    orderBy: desc(ratingHistory.createdAt),
    limit: 200,
  });
  return c.json(history);
});

export default analyticsRoutes;
