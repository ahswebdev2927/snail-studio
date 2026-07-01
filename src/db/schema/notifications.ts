import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

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

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  category: text('category').notNull(), // 'orders' | 'inventory' | 'reviews' | 'system'
  priority: text('priority', { enum: ['low', 'medium', 'high', 'critical'] }).notNull().default('medium'),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  data: text('data'), // JSON string payload e.g. { orderId: 'ord_123' }
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  readAt: integer('read_at', { mode: 'timestamp' }),
}, (table) => [
  index('notifications_user_id_read_idx').on(table.userId, table.read),
  index('notifications_category_idx').on(table.category)
]);

export const notificationPreferences = sqliteTable('notification_preferences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), // 'orders' | 'inventory' | 'reviews' | 'system'
  email: integer('email', { mode: 'boolean' }).notNull().default(true),
  inApp: integer('in_app', { mode: 'boolean' }).notNull().default(true),
  push: integer('push', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  uniqueIndex('user_category_preference_idx').on(table.userId, table.category)
]);

export const activityTimeline = sqliteTable('activity_timeline', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), // Actor (null if system or guest)
  action: text('action').notNull(), // e.g. 'order_placed', 'stock_alert', 'review_submitted'
  entityType: text('entity_type').notNull(), // e.g. 'order', 'product', 'review'
  entityId: text('entity_id'),
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON details
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  index('activity_timeline_created_at_idx').on(table.createdAt)
]);

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(), // FCM token string
  deviceName: text('device_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => [
  uniqueIndex('push_subscription_token_idx').on(table.token),
  index('push_subscription_user_id_idx').on(table.userId)
]);

