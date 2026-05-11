import { drizzle } from "drizzle-orm/d1";
import * as tables from "./schema";
import * as relations from "./relations";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema: { ...tables, ...relations } });
}

export type Database = ReturnType<typeof createDb>;
