import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { products, collections, attributeValues } from './catalog';

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  publicId: text('public_id').notNull(), // Cloudinary public ID
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  format: text('format'),
  width: integer('width'),
  height: integer('height'),
  resourceType: text('resource_type').notNull().default('image'),
  duration: integer('duration'),
  folder: text('folder'),
  altText: text('alt_text'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
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

export const productAttributeMedia = sqliteTable('product_attribute_media', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  attributeValueId: text('attribute_value_id').notNull().references(() => attributeValues.id, { onDelete: 'cascade' }),
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('pam_product_id_idx').on(table.productId),
  index('pam_attribute_value_id_idx').on(table.attributeValueId),
  index('pam_media_id_idx').on(table.mediaId),
  uniqueIndex('pam_prod_attr_media_uq').on(table.productId, table.attributeValueId, table.mediaId)
]);
