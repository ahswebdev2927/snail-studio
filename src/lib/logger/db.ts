import { Logger } from "drizzle-orm/logger";
import { logger } from "./logger";

export class DrizzlePinoLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    logger.debug(
      { query, params, type: "db_query" },
      `DB Query: ${query}`
    );
  }
}
