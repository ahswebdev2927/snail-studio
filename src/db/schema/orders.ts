import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';
import { productVariants } from './catalog';

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), // Nullable for guest purchases
  shipmentId: text('shipment_id'), // Link to active shipment record
  status: text('status', {
    enum: ['pending', 'placed', 'paid', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'refunded', 'partially_refunded']
  }).notNull().default('pending'),
  totalAmount: integer('total_amount').notNull(), // stored in paise / INR subunit
  taxAmount: integer('tax_amount').notNull().default(0),
  shippingAmount: integer('shipping_amount').notNull().default(0),
  discountAmount: integer('discount_amount').notNull().default(0),
  couponCode: text('coupon_code'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),

  // Shipping policy enhancement fields
  shippingChargePaid: integer('shipping_charge_paid').notNull().default(0),
  currentShippingCharge: integer('current_shipping_charge').notNull().default(0),
  shippingDifference: integer('shipping_difference').notNull().default(0),
  shippingDifferencePaid: integer('shipping_difference_paid').notNull().default(0),
  shippingDifferenceStatus: text('shipping_difference_status').notNull().default('none'),
  shippingCalculatedAt: integer('shipping_calculated_at', { mode: 'timestamp' }),
  shippingVerified: integer('shipping_verified', { mode: 'boolean' }).notNull().default(false),
  addressLockedAt: integer('address_locked_at', { mode: 'timestamp' }),
  addressVersion: integer('address_version').notNull().default(1),
  addressVerified: integer('address_verified', { mode: 'boolean' }).notNull().default(false)
}, (table) => [
  index('orders_user_id_status_idx').on(table.userId, table.status),
  index('orders_user_id_idx').on(table.userId),
  index('orders_status_idx').on(table.status),
  index('orders_created_at_idx').on(table.createdAt),
]);

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(), // stored in paise / INR subunit
  discount: integer('discount').notNull().default(0)
});

export const orderAddresses = sqliteTable('order_addresses', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['billing', 'shipping'] }).notNull().default('shipping'),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  addressLine1: text('address_line1').notNull(),
  addressLine2: text('address_line2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  gateway: text('gateway').notNull(), // e.g. "stripe", "razorpay"
  gatewayTransactionId: text('gateway_transaction_id').unique(),
  purpose: text('purpose', { enum: ['checkout', 'shipping_adjustment'] }).notNull().default('checkout'),
  status: text('status').notNull(), // e.g. "succeeded", "failed"
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const refunds = sqliteTable('refunds', {
  id: text('id').primaryKey(),
  paymentId: text('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  gatewayRefundId: text('gateway_refund_id').unique(),
  amount: integer('amount').notNull(),
  reason: text('reason'),
  status: text('status').notNull(), // e.g. "succeeded", "failed"
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const shipments = sqliteTable('shipments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  carrier: text('carrier').notNull().default('Delhivery'),

  // Provider Abstraction Fields
  provider: text('provider', { enum: ['delhivery', 'external'] }).notNull().default('delhivery'),
  courierOrderId: text('courier_order_id').notNull(),
  attemptNumber: integer('attempt_number').notNull().default(1),

  // Waybill & Tracking Fields
  waybill: text('waybill'),
  trackingNumber: text('tracking_number').notNull(),
  trackingUrl: text('tracking_url'),

  // Status & Timestamps
  status: text('status', {
    enum: ['pending', 'manifested', 'ready_to_ship', 'pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'ndr', 'cancelled', 'rto']
  }).notNull().default('pending'),

  // Pincode Serviceability Log
  serviceabilityStatus: text('serviceability_status', { enum: ['serviceable', 'non_serviceable', 'unknown'] }).default('unknown'),
  serviceabilityCheckedAt: integer('serviceability_checked_at', { mode: 'timestamp' }),

  // External Courier Overrides
  isExternal: integer('is_external', { mode: 'boolean' }).notNull().default(false),
  externalCourierName: text('external_courier_name'),
  externalMetadata: text('external_metadata'),

  shippedAt: integer('shipped_at', { mode: 'timestamp' }),
  estimatedDeliveryAt: integer('estimated_delivery_at', { mode: 'timestamp' }),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('shipments_order_id_idx').on(table.orderId),
  index('shipments_courier_order_id_idx').on(table.courierOrderId),
  index('shipments_waybill_idx').on(table.waybill),
  index('shipments_status_idx').on(table.status),
]);

export const trackingEvents = sqliteTable('tracking_events', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  location: text('location'),
  description: text('description'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const orderStatusHistory = sqliteTable('order_status_history', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const orderAddressHistory = sqliteTable('order_address_history', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  editedBy: text('edited_by').notNull(),
  oldAddress: text('old_address').notNull(), // JSON string
  newAddress: text('new_address').notNull(), // JSON string
  shippingBefore: integer('shipping_before').notNull(),
  shippingAfter: integer('shipping_after').notNull(),
  difference: integer('difference').notNull(),
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const shipmentAuditLogs = sqliteTable('shipment_audit_logs', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').references(() => shipments.id, { onDelete: 'set null' }),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  adminId: text('admin_id'),
  adminName: text('admin_name').notNull().default('Admin'),
  action: text('action').notNull(),
  previousState: text('previous_state'), // JSON string
  newState: text('new_state'), // JSON string
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => [
  index('shipment_audit_logs_order_id_idx').on(table.orderId),
  index('shipment_audit_logs_shipment_id_idx').on(table.shipmentId),
  index('shipment_audit_logs_created_at_idx').on(table.createdAt),
]);

