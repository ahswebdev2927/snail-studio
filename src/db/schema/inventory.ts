import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { productVariants, carts } from './catalog';

export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(),
  variantId: text('variant_id').notNull().unique().references(() => productVariants.id, { onDelete: 'cascade' }),
  stockLevel: integer('stock_level').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('inventory_items_stock_level_idx').on(table.stockLevel),
]);

export const inventoryTransactions = sqliteTable('inventory_transactions', {
  id: text('id').primaryKey(),
  inventoryItemId: text('inventory_item_id').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['inbound', 'outbound', 'adjustment'] }).notNull(),
  quantity: integer('quantity').notNull(),
  reference: text('reference'), // e.g. "manual adjustment", "order_123"
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('inventory_transactions_item_id_idx').on(table.inventoryItemId),
]);

export const inventoryReservations = sqliteTable('inventory_reservations', {
  id: text('id').primaryKey(),
  inventoryItemId: text('inventory_item_id').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  cartId: text('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
