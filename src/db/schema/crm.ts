import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { products } from './catalog';

export const recentlyViewed = sqliteTable('recently_viewed', {
  id: text('id').primaryKey(), // nanoid
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('recently_viewed_user_id_idx').on(table.userId),
  index('recently_viewed_user_id_created_at_idx').on(table.userId, table.createdAt),
  index('recently_viewed_user_product_idx').on(table.userId, table.productId)
]);

export const customerTags = sqliteTable('customer_tags', {
  id: text('id').primaryKey(), // nanoid
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('customer_tags_user_id_idx').on(table.userId),
  uniqueIndex('customer_tags_user_tag_uniq').on(table.userId, table.tag)
]);
