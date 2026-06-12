import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products, collections } from './catalog';

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  publicId: text('public_id').notNull(), // Cloudinary public ID
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  format: text('format'),
  width: integer('width'),
  height: integer('height'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const productMedia = sqliteTable('product_media', {
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0)
}, (t) => [
  primaryKey({ columns: [t.productId, t.mediaId] })
]);

export const collectionMedia = sqliteTable('collection_media', {
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' })
}, (t) => [
  primaryKey({ columns: [t.collectionId, t.mediaId] })
]);
