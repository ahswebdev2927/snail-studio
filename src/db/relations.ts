import { relations } from 'drizzle-orm';
import * as schema from './schema';

// --- AUTH MAPPINGS ---

export const usersRelations = relations(schema.users, ({ many }) => ({
  addresses: many(schema.userAddresses),
  refreshTokens: many(schema.refreshTokens),
  userDevices: many(schema.userDevices),
  auditLogs: many(schema.userAuditLogs),
  orders: many(schema.orders),
  reviews: many(schema.reviews),
  wishlists: many(schema.wishlists),
  carts: many(schema.carts),
  couponUsages: many(schema.couponUsage)
}));

export const refreshTokensRelations = relations(schema.refreshTokens, ({ one }) => ({
  user: one(schema.users, {
    fields: [schema.refreshTokens.userId],
    references: [schema.users.id]
  })
}));

export const userDevicesRelations = relations(schema.userDevices, ({ one }) => ({
  user: one(schema.users, {
    fields: [schema.userDevices.userId],
    references: [schema.users.id]
  })
}));

export const userAddressesRelations = relations(schema.userAddresses, ({ one }) => ({
  user: one(schema.users, {
    fields: [schema.userAddresses.userId],
    references: [schema.users.id]
  })
}));

export const userAuditLogsRelations = relations(schema.userAuditLogs, ({ one }) => ({
  user: one(schema.users, {
    fields: [schema.userAuditLogs.userId],
    references: [schema.users.id]
  })
}));

// --- CATALOG MAPPINGS ---

export const brandsRelations = relations(schema.brands, ({ many }) => ({
  products: many(schema.products)
}));

export const categoriesRelations = relations(schema.categories, ({ one, many }) => ({
  parent: one(schema.categories, {
    fields: [schema.categories.parentId],
    references: [schema.categories.id],
    relationName: 'categoryParent'
  }),
  children: many(schema.categories, {
    relationName: 'categoryParent'
  }),
  products: many(schema.products)
}));

export const productsRelations = relations(schema.products, ({ one, many }) => ({
  brand: one(schema.brands, {
    fields: [schema.products.brandId],
    references: [schema.brands.id]
  }),
  category: one(schema.categories, {
    fields: [schema.products.categoryId],
    references: [schema.categories.id]
  }),
  variants: many(schema.productVariants),
  attributeValues: many(schema.productAttributeValues),
  collections: many(schema.productCollections),
  wishlistItems: many(schema.wishlistItems),
  reviews: many(schema.reviews),
  media: many(schema.productMedia),
  bundles: many(schema.productBundleItems)
}));

export const attributeGroupsRelations = relations(schema.attributeGroups, ({ many }) => ({
  values: many(schema.attributeValues)
}));

export const attributeValuesRelations = relations(schema.attributeValues, ({ one, many }) => ({
  group: one(schema.attributeGroups, {
    fields: [schema.attributeValues.groupId],
    references: [schema.attributeGroups.id]
  }),
  products: many(schema.productAttributeValues),
  variants: many(schema.variantAttributeValues)
}));

export const productAttributeValuesRelations = relations(schema.productAttributeValues, ({ one }) => ({
  product: one(schema.products, {
    fields: [schema.productAttributeValues.productId],
    references: [schema.products.id]
  }),
  attributeValue: one(schema.attributeValues, {
    fields: [schema.productAttributeValues.attributeValueId],
    references: [schema.attributeValues.id]
  })
}));

export const productVariantsRelations = relations(schema.productVariants, ({ one, many }) => ({
  product: one(schema.products, {
    fields: [schema.productVariants.productId],
    references: [schema.products.id]
  }),
  attributes: many(schema.variantAttributeValues),
  inventory: one(schema.inventoryItems, {
    fields: [schema.productVariants.id],
    references: [schema.inventoryItems.variantId]
  }),
  cartItems: many(schema.cartItems),
  orderItems: many(schema.orderItems)
}));

export const variantAttributeValuesRelations = relations(schema.variantAttributeValues, ({ one }) => ({
  variant: one(schema.productVariants, {
    fields: [schema.variantAttributeValues.variantId],
    references: [schema.productVariants.id]
  }),
  attributeValue: one(schema.attributeValues, {
    fields: [schema.variantAttributeValues.attributeValueId],
    references: [schema.attributeValues.id]
  })
}));

export const collectionsRelations = relations(schema.collections, ({ many }) => ({
  rules: many(schema.collectionRules),
  products: many(schema.productCollections),
  media: many(schema.collectionMedia)
}));

export const collectionRulesRelations = relations(schema.collectionRules, ({ one }) => ({
  collection: one(schema.collections, {
    fields: [schema.collectionRules.collectionId],
    references: [schema.collections.id]
  })
}));

export const productCollectionsRelations = relations(schema.productCollections, ({ one }) => ({
  product: one(schema.products, {
    fields: [schema.productCollections.productId],
    references: [schema.products.id]
  }),
  collection: one(schema.collections, {
    fields: [schema.productCollections.collectionId],
    references: [schema.collections.id]
  })
}));

export const wishlistsRelations = relations(schema.wishlists, ({ one, many }) => ({
  user: one(schema.users, {
    fields: [schema.wishlists.userId],
    references: [schema.users.id]
  }),
  items: many(schema.wishlistItems)
}));

export const wishlistItemsRelations = relations(schema.wishlistItems, ({ one }) => ({
  wishlist: one(schema.wishlists, {
    fields: [schema.wishlistItems.wishlistId],
    references: [schema.wishlists.id]
  }),
  product: one(schema.products, {
    fields: [schema.wishlistItems.productId],
    references: [schema.products.id]
  })
}));

export const cartsRelations = relations(schema.carts, ({ one, many }) => ({
  user: one(schema.users, {
    fields: [schema.carts.userId],
    references: [schema.users.id]
  }),
  items: many(schema.cartItems),
  reservations: many(schema.inventoryReservations)
}));

export const cartItemsRelations = relations(schema.cartItems, ({ one }) => ({
  cart: one(schema.carts, {
    fields: [schema.cartItems.cartId],
    references: [schema.carts.id]
  }),
  variant: one(schema.productVariants, {
    fields: [schema.cartItems.variantId],
    references: [schema.productVariants.id]
  })
}));

// --- INVENTORY MAPPINGS ---

export const inventoryItemsRelations = relations(schema.inventoryItems, ({ one, many }) => ({
  variant: one(schema.productVariants, {
    fields: [schema.inventoryItems.variantId],
    references: [schema.productVariants.id]
  }),
  transactions: many(schema.inventoryTransactions),
  reservations: many(schema.inventoryReservations)
}));

export const inventoryTransactionsRelations = relations(schema.inventoryTransactions, ({ one }) => ({
  inventoryItem: one(schema.inventoryItems, {
    fields: [schema.inventoryTransactions.inventoryItemId],
    references: [schema.inventoryItems.id]
  })
}));

export const inventoryReservationsRelations = relations(schema.inventoryReservations, ({ one }) => ({
  inventoryItem: one(schema.inventoryItems, {
    fields: [schema.inventoryReservations.inventoryItemId],
    references: [schema.inventoryItems.id]
  }),
  cart: one(schema.carts, {
    fields: [schema.inventoryReservations.cartId],
    references: [schema.carts.id]
  })
}));

// --- ORDER MAPPINGS ---

export const ordersRelations = relations(schema.orders, ({ one, many }) => ({
  user: one(schema.users, {
    fields: [schema.orders.userId],
    references: [schema.users.id]
  }),
  items: many(schema.orderItems),
  addresses: many(schema.orderAddresses),
  payments: many(schema.payments),
  shipments: many(schema.shipments),
  statusHistory: many(schema.orderStatusHistory),
  couponUsages: many(schema.couponUsage)
}));

export const orderItemsRelations = relations(schema.orderItems, ({ one }) => ({
  order: one(schema.orders, {
    fields: [schema.orderItems.orderId],
    references: [schema.orders.id]
  }),
  variant: one(schema.productVariants, {
    fields: [schema.orderItems.variantId],
    references: [schema.productVariants.id]
  })
}));

export const orderAddressesRelations = relations(schema.orderAddresses, ({ one }) => ({
  order: one(schema.orders, {
    fields: [schema.orderAddresses.orderId],
    references: [schema.orders.id]
  })
}));

export const paymentsRelations = relations(schema.payments, ({ one, many }) => ({
  order: one(schema.orders, {
    fields: [schema.payments.orderId],
    references: [schema.orders.id]
  }),
  refunds: many(schema.refunds)
}));

export const refundsRelations = relations(schema.refunds, ({ one }) => ({
  payment: one(schema.payments, {
    fields: [schema.refunds.paymentId],
    references: [schema.payments.id]
  })
}));

export const shipmentsRelations = relations(schema.shipments, ({ one, many }) => ({
  order: one(schema.orders, {
    fields: [schema.shipments.orderId],
    references: [schema.orders.id]
  }),
  events: many(schema.trackingEvents)
}));

export const trackingEventsRelations = relations(schema.trackingEvents, ({ one }) => ({
  shipment: one(schema.shipments, {
    fields: [schema.trackingEvents.shipmentId],
    references: [schema.shipments.id]
  })
}));

export const orderStatusHistoryRelations = relations(schema.orderStatusHistory, ({ one }) => ({
  order: one(schema.orders, {
    fields: [schema.orderStatusHistory.orderId],
    references: [schema.orders.id]
  })
}));

// --- MEDIA MAPPINGS ---

export const mediaRelations = relations(schema.media, ({ many }) => ({
  productMedia: many(schema.productMedia),
  collectionMedia: many(schema.collectionMedia),
  reviewImages: many(schema.reviewImages)
}));

export const productMediaRelations = relations(schema.productMedia, ({ one }) => ({
  product: one(schema.products, {
    fields: [schema.productMedia.productId],
    references: [schema.products.id]
  }),
  media: one(schema.media, {
    fields: [schema.productMedia.mediaId],
    references: [schema.media.id]
  })
}));

export const collectionMediaRelations = relations(schema.collectionMedia, ({ one }) => ({
  collection: one(schema.collections, {
    fields: [schema.collectionMedia.collectionId],
    references: [schema.collections.id]
  }),
  media: one(schema.media, {
    fields: [schema.collectionMedia.mediaId],
    references: [schema.media.id]
  })
}));

// --- REVIEW MAPPINGS ---

export const reviewsRelations = relations(schema.reviews, ({ one, many }) => ({
  product: one(schema.products, {
    fields: [schema.reviews.productId],
    references: [schema.products.id]
  }),
  user: one(schema.users, {
    fields: [schema.reviews.userId],
    references: [schema.users.id]
  }),
  images: many(schema.reviewImages)
}));

export const reviewImagesRelations = relations(schema.reviewImages, ({ one }) => ({
  review: one(schema.reviews, {
    fields: [schema.reviewImages.reviewId],
    references: [schema.reviews.id]
  }),
  media: one(schema.media, {
    fields: [schema.reviewImages.mediaId],
    references: [schema.media.id]
  })
}));

// --- MARKETING MAPPINGS ---

export const couponsRelations = relations(schema.coupons, ({ many }) => ({
  usages: many(schema.couponUsage)
}));

export const couponUsageRelations = relations(schema.couponUsage, ({ one }) => ({
  coupon: one(schema.coupons, {
    fields: [schema.couponUsage.couponId],
    references: [schema.coupons.id]
  }),
  order: one(schema.orders, {
    fields: [schema.couponUsage.orderId],
    references: [schema.orders.id]
  }),
  user: one(schema.users, {
    fields: [schema.couponUsage.userId],
    references: [schema.users.id]
  })
}));

export const productBundlesRelations = relations(schema.productBundles, ({ many }) => ({
  items: many(schema.productBundleItems)
}));

export const productBundleItemsRelations = relations(schema.productBundleItems, ({ one }) => ({
  bundle: one(schema.productBundles, {
    fields: [schema.productBundleItems.bundleId],
    references: [schema.productBundles.id]
  }),
  product: one(schema.products, {
    fields: [schema.productBundleItems.productId],
    references: [schema.products.id]
  })
}));
