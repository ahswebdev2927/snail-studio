import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema/index.ts",
  out: "./database/migrations",
  dbCredentials: {
    url: process.env.DB_PROVIDER === "sqlite"
      ? process.env.SQLITE_DATABASE_URL || "file:./database/local.db"
      : process.env.TURSO_DATABASE_URL || "",
    authToken: process.env.DB_PROVIDER === "sqlite" ? undefined : process.env.TURSO_AUTH_TOKEN,
  } as any,
});
