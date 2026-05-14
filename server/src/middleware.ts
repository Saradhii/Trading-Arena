import { createDb } from "./db";
import type { Env } from "./env";
import type { Database } from "./db";
import { createMiddleware } from "hono/factory";

export type AppType = {
  Bindings: Env;
  Variables: {
    db: Database;
  };
};

export const dbMiddleware = createMiddleware<AppType>(async (c, next) => {
  const db = createDb(c.env.DB);
  c.set("db", db);
  await next();
});
