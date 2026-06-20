import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { orders } from './orders';
import { users } from './auth';

export const coupons = sqliteTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type', { enum: ['percentage', 'fixed'] }).notNull().default('percentage'),
  discountValue: integer('discount_value').notNull(), // value in percentage or paise
  minOrderAmount: integer('min_order_amount'), // minimum order value in paise
  maxDiscountAmount: integer('max_discount_amount'), // max discount limit in paise
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  usageLimit: integer('usage_limit'),
  usageCount: integer('usage_count').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const couponUsage = sqliteTable('coupon_usage', {
  id: text('id').primaryKey(),
  couponId: text('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const heroBanners = sqliteTable('hero_banners', {
  id: text('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  ctaText: text('cta_text'),
  ctaLink: text('cta_link'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const sizeProfiles = sqliteTable('size_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  thumb: integer('thumb').notNull(),
  index: integer('index').notNull(),
  middle: integer('middle').notNull(),
  ring: integer('ring').notNull(),
  pinky: integer('pinky').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  uniqueIndex('size_profiles_name_unique').on(table.name)
]);
