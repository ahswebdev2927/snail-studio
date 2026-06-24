import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

export const searchLogs = sqliteTable('search_logs', {
  id: text('id').primaryKey(),
  query: text('query').notNull(),
  resultsCount: integer('results_count').notNull().default(0),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('search_logs_query_idx').on(table.query),
  index('search_logs_user_id_idx').on(table.userId),
  index('search_logs_created_at_idx').on(table.createdAt)
]);
