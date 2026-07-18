import { sqliteTable, text, integer, uniqueIndex, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { orders } from './orders';
import { users } from './auth';
import { products } from './catalog';

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
}, (table) => [
  index('coupon_usage_user_id_idx').on(table.userId)
]);

export const heroBanners = sqliteTable('hero_banners', {
  id: text('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  ctaText: text('cta_text'),
  ctaLink: text('cta_link'),
  textColor: text('text_color').notNull().default('#ffffff'),
  contentAlignment: text('content_alignment').notNull().default('center'),
  lineSpacing: text('line_spacing').notNull().default('normal'),
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

export const launchSubscribers = sqliteTable('launch_subscribers', {
  id: text('id').primaryKey(), // nanoid
  email: text('email').notNull(),
  name: text('name'),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }),
  sent7DayReminder: integer('sent_7_day_reminder', { mode: 'boolean' }).notNull().default(false),
  sent3DayReminder: integer('sent_3_day_reminder', { mode: 'boolean' }).notNull().default(false),
  sent1DayReminder: integer('sent_1_day_reminder', { mode: 'boolean' }).notNull().default(false),
  sentLaunchDayReminder: integer('sent_launch_day_reminder', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  uniqueIndex('launch_subscribers_email_product_unique').on(table.email, table.productId)
]);

export const emailMarketingPreferences = sqliteTable('email_marketing_preferences', {
  id: text('id').primaryKey(), // nanoid
  email: text('email').notNull().unique(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // optional link if registered
  newsletter: integer('newsletter', { mode: 'boolean' }).notNull().default(true),
  promotions: integer('promotions', { mode: 'boolean' }).notNull().default(true),
  launchNotifications: integer('launch_notifications', { mode: 'boolean' }).notNull().default(true),
  backInStock: integer('back_in_stock', { mode: 'boolean' }).notNull().default(true),
  productUpdates: integer('product_updates', { mode: 'boolean' }).notNull().default(true),
  priceDrops: integer('price_drops', { mode: 'boolean' }).notNull().default(true),
  unsubscribedAll: integer('unsubscribed_all', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('pref_email_idx').on(table.email),
  index('pref_user_id_idx').on(table.userId)
]);

export const marketingCampaigns = sqliteTable('marketing_campaigns', {
  id: text('id').primaryKey(), // nanoid
  name: text('name').notNull(), // admin internal name
  subject: text('subject').notNull(), // email subject line
  campaignType: text('campaign_type', {
    enum: [
      'promotions', 'flash_sales', 'new_arrivals', 'product_launches', 'newsletters', 'festival_offers', 'coupons',
      'promotion', 'new_collection', 'festival', 'flash_sale', 'vip_offer', 'wishlist_reminder', 'cart_recovery', 'review_request', 'win_back', 'custom'
    ]
  }).notNull(),
  segmentType: text('segment_type', {
    enum: ['all', 'selected', 'vip', 'frequent', 'new', 'inactive', 'cart_abandoners', 'wishlist', 'launch_subscribers', 'custom']
  }).notNull(),
  segmentDetails: text('segment_details'), // JSON string for selected user IDs / custom filter criteria
  templateName: text('template_name').notNull(), // promotions, coupons, newsletter, launch, flash_sale, etc.
  bodyHtml: text('body_html').notNull(), // compiled HTML body
  bodyJson: text('body_json'), // structured blocks configuration (if using builder UI)
  couponId: text('coupon_id').references(() => coupons.id, { onDelete: 'set null' }), // optional coupon attachment
  featuredProductIds: text('featured_product_ids'), // JSON string array of product IDs to show in grid
  status: text('status', {
    enum: ['draft', 'scheduled', 'queued', 'sending', 'completed', 'paused', 'cancelled', 'failed', 'sent']
  }).notNull().default('draft'),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const marketingCampaignDeliveries = sqliteTable('marketing_campaign_deliveries', {
  id: text('id').primaryKey(), // unique delivery track ID
  campaignId: text('campaign_id').notNull().references(() => marketingCampaigns.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  resendMessageId: text('resend_message_id'), // message ID returned by Resend API
  status: text('status', {
    enum: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'failed']
  }).notNull().default('sent'),
  revenue: integer('revenue').notNull().default(0), // revenue generated in paise
  openedAt: integer('opened_at', { mode: 'timestamp' }),
  clickedAt: integer('clicked_at', { mode: 'timestamp' }),
  bouncedAt: integer('bounced_at', { mode: 'timestamp' }),
  unsubscribedAt: integer('unsubscribed_at', { mode: 'timestamp' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('delivery_campaign_id_idx').on(table.campaignId),
  index('delivery_email_idx').on(table.email),
  index('delivery_resend_id_idx').on(table.resendMessageId)
]);

export const marketingCampaignRuns = sqliteTable('marketing_campaign_runs', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => marketingCampaigns.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['started', 'completed', 'failed']
  }).notNull().default('started'),
  recipientsCount: integer('recipients_count').notNull().default(0),
  sentCount: integer('sent_count').notNull().default(0),
  failedCount: integer('failed_count').notNull().default(0),
  revenue: integer('revenue').notNull().default(0), // total checkout revenue attributed in paise
  ctr: integer('ctr').notNull().default(0), // CTR percentage (0-100)
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  completedAt: integer('completed_at', { mode: 'timestamp' })
}, (table) => [
  index('run_campaign_id_idx').on(table.campaignId)
]);

export const marketingRecipientSnapshots = sqliteTable('marketing_recipient_snapshots', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => marketingCampaigns.id, { onDelete: 'cascade' }),
  runId: text('run_id').notNull().references(() => marketingCampaignRuns.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  status: text('status', {
    enum: ['pending', 'sent', 'failed']
  }).notNull().default('pending'),
  retryCount: integer('retry_count').notNull().default(0),
  nextRetryAt: integer('next_retry_at', { mode: 'timestamp' }),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('snapshot_campaign_id_idx').on(table.campaignId),
  index('snapshot_run_id_idx').on(table.runId),
  index('snapshot_email_idx').on(table.email)
]);

export const marketingSuppressions = sqliteTable('marketing_suppressions', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  reason: text('reason', {
    enum: ['hard_bounce', 'complaint', 'manual_unsubscribe']
  }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  uniqueIndex('suppression_email_unique_idx').on(table.email)
]);

export const announcements = sqliteTable('announcements', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  icon: text('icon'), // none, sparkles, truck, tag, gift, star, percent, shoppingBag, info, shieldCheck
  ctaText: text('cta_text'),
  ctaLink: text('cta_link'),
  textColor: text('text_color').notNull().default('#ffffff'),
  backgroundColor: text('background_color').notNull().default('#A85328'),
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const productBundles = sqliteTable('product_bundles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  discountType: text('discount_type', { enum: ['percentage', 'fixed'] }).notNull().default('percentage'),
  discountValue: integer('discount_value').notNull(), // percentage point (e.g. 15 for 15%) or paise
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const productBundleItems = sqliteTable('product_bundle_items', {
  bundleId: text('bundle_id').notNull().references(() => productBundles.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' })
}, (t) => [
  primaryKey({ columns: [t.bundleId, t.productId] })
]);

export const launchBanners = sqliteTable('launch_banners', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  backgroundImage: text('background_image'),
  productImage: text('product_image'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const launchEvents = sqliteTable('launch_events', {
  id: text('id').primaryKey(), // nanoid
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // 'subscriber_signup' | 'countdown_view' | 'reminder_open' | 'launch_conversion'
  metadata: text('metadata'), // JSON string payload
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
