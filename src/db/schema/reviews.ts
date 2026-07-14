import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products } from './catalog';
import { users } from './auth';
import { media } from './media';

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // rating from 1 to 5
  title: text('title'),
  comment: text('comment'),
  isApproved: integer('is_approved', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('reviews_user_id_idx').on(table.userId),
  index('reviews_product_id_idx').on(table.productId)
]);

export const reviewImages = sqliteTable('review_images', {
  reviewId: text('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' })
}, (t) => [
  primaryKey({ columns: [t.reviewId, t.mediaId] })
]);
