import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  parentId: text('parent_id').references((): any => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  image: text('image'),
  showOnHomepage: integer('show_on_homepage', { mode: 'boolean' }).notNull().default(false),
  showInDropdown: integer('show_in_dropdown', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  brandId: text('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  shortDescription: text('short_description'),
  priceMin: integer('price_min').notNull(), // stored in paise / INR subunit
  priceMax: integer('price_max').notNull(),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  isBestSeller: integer('is_best_seller', { mode: 'boolean' }).notNull().default(false),
  isNewArrival: integer('is_new_arrival', { mode: 'boolean' }).notNull().default(false),
  isTrending: integer('is_trending', { mode: 'boolean' }).notNull().default(false),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  ogImage: text('og_image'),
  status: text('status', { enum: ['Active', 'Draft', 'Out Of Stock', 'Archived', 'Hidden', 'Coming Soon', 'Launching Soon'] }).notNull().default('Active'),
  launchDate: text('launch_date'),
  launchTime: text('launch_time'),
  launchTimeZone: text('launch_time_zone').default('Asia/Kolkata'),
  autoPublish: integer('auto_publish', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  views: integer('views').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('products_name_idx').on(table.name),
  index('products_slug_idx').on(table.slug),
  index('products_brand_id_idx').on(table.brandId),
  index('products_category_id_idx').on(table.categoryId),
  index('products_is_active_idx').on(table.isActive),
  index('products_is_featured_idx').on(table.isFeatured),
  index('products_is_best_seller_idx').on(table.isBestSeller),
]);

export const attributeGroups = sqliteTable('attribute_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(), // e.g. "length", "shape"
  attributeType: text('attributeType', { enum: ['VARIANT', 'CATALOG'] }).notNull().default('VARIANT'),
  variantAxis: integer('variantAxis', { mode: 'boolean' }).notNull().default(true),
  filterable: integer('filterable', { mode: 'boolean' }).notNull().default(true),
  searchable: integer('searchable', { mode: 'boolean' }).notNull().default(true),
  visibleOnPdp: integer('visibleOnPdp', { mode: 'boolean' }).notNull().default(true),
  showInDropdown: integer('show_in_dropdown', { mode: 'boolean' }).notNull().default(false),
  displayOrder: integer('displayOrder').notNull().default(0)
});

export const attributeValues = sqliteTable('attribute_values', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => attributeGroups.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  code: text('code').notNull() // e.g. "short", "coffin"
});

export const productAttributeValues = sqliteTable('product_attribute_values', {
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  attributeValueId: text('attribute_value_id').notNull().references(() => attributeValues.id, { onDelete: 'cascade' })
}, (t) => [
  primaryKey({ columns: [t.productId, t.attributeValueId] })
]);

export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  compareAtPrice: integer('compare_at_price'),
  barcode: text('barcode').unique(),
  status: text('status', { enum: ['Active', 'Disabled', 'Archived'] }).notNull().default('Active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('product_variants_price_idx').on(table.price),
]);

export const variantAttributeValues = sqliteTable('variant_attribute_values', {
  variantId: text('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  attributeValueId: text('attribute_value_id').notNull().references(() => attributeValues.id, { onDelete: 'cascade' })
}, (t) => [
  primaryKey({ columns: [t.variantId, t.attributeValueId] })
]);

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  type: text('type', { enum: ['manual', 'dynamic'] }).notNull().default('manual'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  showOnHomepage: integer('show_on_homepage', { mode: 'boolean' }).notNull().default(false),
  showInDropdown: integer('show_in_dropdown', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const collectionRules = sqliteTable('collection_rules', {
  id: text('id').primaryKey(),
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  column: text('column').notNull(), // e.g. "shape", "color"
  relation: text('relation').notNull(), // e.g. "equals", "contains"
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const productCollections = sqliteTable('product_collections', {
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' })
}, (t) => [
  primaryKey({ columns: [t.productId, t.collectionId] })
]);

export const wishlists = sqliteTable('wishlists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('wishlists_user_id_idx').on(table.userId)
]);

export const wishlistItems = sqliteTable('wishlist_items', {
  wishlistId: text('wishlist_id').notNull().references(() => wishlists.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (t) => [
  primaryKey({ columns: [t.wishlistId, t.productId] })
]);

export const carts = sqliteTable('carts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // nullable for guests
  guestCartToken: text('guest_cart_token'), // nullable, unique token for cookies
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const cartItems = sqliteTable('cart_items', {
  cartId: text('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull()
}, (t) => [
  primaryKey({ columns: [t.cartId, t.variantId] })
]);
