import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const emailLogs = sqliteTable('email_logs', {
  id: text('id').primaryKey(),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  templateName: text('template_name').notNull(), // e.g. 'order_confirmation', 'order_status_update', 'test_email'
  status: text('status', { enum: ['success', 'failed'] }).notNull(),
  errorMessage: text('error_message'),
  sentAt: integer('sent_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
