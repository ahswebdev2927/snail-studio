import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const provider = process.env.DB_PROVIDER || "sqlite";
const url = provider === "sqlite" 
  ? process.env.SQLITE_DATABASE_URL || "file:./database/local-dev.db" 
  : process.env.TURSO_DATABASE_URL;
const authToken = provider === "sqlite" ? undefined : process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error(`Database URL is missing for provider: ${provider}`);
}

export const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });
