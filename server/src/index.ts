import { Hono } from "hono";
import { createDb } from "./db";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/health", async (c) => {
  const db = createDb(c.env.DB);
  const result = await db.run("SELECT 1 as ok");
  return c.json({ status: "ok", db: result });
});

export default app;
