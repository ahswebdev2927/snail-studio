import { db } from "@/db";
import { users, orders, carts, cartItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface CustomerMetrics {
  id: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  totalSpent: number; // in paise
  completedOrdersCount: number;
  wishlistCount: number;
  cartUpdatedAt: Date | null;
  cartHasItems: boolean;
}

/**
 * Constants defining thresholds for customer segmentation.
 */
export const SEGMENT_RULES = {
  VIP_SPENT_THRESHOLD: 45000 * 100, // ₹45,000 in paise
  VIP_ORDERS_THRESHOLD: 5,
  FREQUENT_ORDERS_THRESHOLD: 3,
  HIGH_LTV_SPENT_THRESHOLD: 15000 * 100, // ₹15,000 in paise
  NEW_CUSTOMER_DAYS: 14,
  INACTIVE_DAYS: 60,
  CART_ABANDON_HOURS: 2,
};

/**
 * Classifies a customer into segment groups based on their metrics.
 */
export function evaluateCustomerSegments(metrics: CustomerMetrics): string[] {
  const segments: string[] = [];
  const now = new Date();

  // 1. VIP Customers
  if (
    metrics.totalSpent >= SEGMENT_RULES.VIP_SPENT_THRESHOLD ||
    metrics.completedOrdersCount >= SEGMENT_RULES.VIP_ORDERS_THRESHOLD
  ) {
    segments.push("VIP Customers");
  }

  // 2. Frequent Buyers
  if (metrics.completedOrdersCount >= SEGMENT_RULES.FREQUENT_ORDERS_THRESHOLD) {
    segments.push("Frequent Buyers");
  }

  // 3. One-Time Buyers
  if (metrics.completedOrdersCount === 1) {
    segments.push("One-Time Buyers");
  }

  // 4. Cart Abandoners
  if (metrics.cartHasItems && metrics.cartUpdatedAt) {
    const hoursSinceCartUpdate = (now.getTime() - metrics.cartUpdatedAt.getTime()) / (1000 * 60 * 60);
    // If cart has items, updated more than 2 hours ago
    if (hoursSinceCartUpdate >= SEGMENT_RULES.CART_ABANDON_HOURS) {
      segments.push("Cart Abandoners");
    }
  }

  // 5. Wishlist Heavy Users
  if (metrics.wishlistCount >= 5) {
    segments.push("Wishlist Heavy Users");
  }

  // 6. High Lifetime Value
  if (metrics.totalSpent >= SEGMENT_RULES.HIGH_LTV_SPENT_THRESHOLD) {
    segments.push("High Lifetime Value");
  }

  // 7. New Customers
  const daysSinceCreation = (now.getTime() - metrics.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation <= SEGMENT_RULES.NEW_CUSTOMER_DAYS) {
    segments.push("New Customers");
  }

  // 8. Inactive Customers
  const loginReferenceDate = metrics.lastLoginAt || metrics.createdAt;
  const daysSinceLogin = (now.getTime() - loginReferenceDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLogin >= SEGMENT_RULES.INACTIVE_DAYS && metrics.completedOrdersCount === 0) {
    // If they haven't logged in for 60 days and never completed an order
    segments.push("Inactive Customers");
  } else if (daysSinceLogin >= SEGMENT_RULES.INACTIVE_DAYS) {
    // Or if their last order was > 60 days ago and no login in 60 days
    segments.push("Inactive Customers");
  }

  return segments;
}

/**
 * Fetch aggregation metrics for a single customer.
 */
async function fetchCustomerMetrics(userId: string): Promise<CustomerMetrics | null> {
  const results = await db
    .select({
      id: users.id,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered') THEN ${orders.totalAmount} ELSE 0 END), 0)`.mapWith(Number),
      completedOrdersCount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered') THEN 1 ELSE 0 END), 0)`.mapWith(Number),
      wishlistCount: sql<number>`COALESCE((SELECT COUNT(*) FROM wishlist_items JOIN wishlists ON wishlist_items.wishlist_id = wishlists.id WHERE wishlists.user_id = ${users.id}), 0)`.mapWith(Number),
      cartUpdatedAt: sql<number>`(SELECT ${carts.updatedAt} FROM carts JOIN cart_items ON carts.id = cart_items.cart_id WHERE carts.user_id = ${users.id} LIMIT 1)`.mapWith(Number),
      cartHasItems: sql<boolean>`EXISTS(SELECT 1 FROM carts JOIN cart_items ON carts.id = cart_items.cart_id WHERE carts.user_id = ${users.id})`.mapWith(Boolean)
    })
    .from(users)
    .leftJoin(orders, eq(users.id, orders.userId))
    .where(eq(users.id, userId))
    .groupBy(users.id);

  if (results.length === 0) return null;
  const row = results[0];

  return {
    id: row.id,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
    totalSpent: row.totalSpent,
    completedOrdersCount: row.completedOrdersCount,
    wishlistCount: row.wishlistCount,
    cartUpdatedAt: row.cartUpdatedAt ? new Date(row.cartUpdatedAt) : null,
    cartHasItems: !!row.cartHasItems,
  };
}

/**
 * Fetch aggregation metrics for all customers.
 */
async function fetchAllCustomersMetrics(): Promise<CustomerMetrics[]> {
  const results = await db
    .select({
      id: users.id,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered') THEN ${orders.totalAmount} ELSE 0 END), 0)`.mapWith(Number),
      completedOrdersCount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered') THEN 1 ELSE 0 END), 0)`.mapWith(Number),
      wishlistCount: sql<number>`COALESCE((SELECT COUNT(*) FROM wishlist_items JOIN wishlists ON wishlist_items.wishlist_id = wishlists.id WHERE wishlists.user_id = ${users.id}), 0)`.mapWith(Number),
      cartUpdatedAt: sql<number>`(SELECT ${carts.updatedAt} FROM carts JOIN cart_items ON carts.id = cart_items.cart_id WHERE carts.user_id = ${users.id} LIMIT 1)`.mapWith(Number),
      cartHasItems: sql<boolean>`EXISTS(SELECT 1 FROM carts JOIN cart_items ON carts.id = cart_items.cart_id WHERE carts.user_id = ${users.id})`.mapWith(Boolean)
    })
    .from(users)
    .leftJoin(orders, eq(users.id, orders.userId))
    .where(eq(users.role, "customer"))
    .groupBy(users.id);

  return results.map(row => ({
    id: row.id,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
    totalSpent: row.totalSpent,
    completedOrdersCount: row.completedOrdersCount,
    wishlistCount: row.wishlistCount,
    cartUpdatedAt: row.cartUpdatedAt ? new Date(row.cartUpdatedAt) : null,
    cartHasItems: !!row.cartHasItems,
  }));
}

/**
 * Evaluates and returns segments a customer belongs to.
 */
export async function getCustomerSegments(userId: string): Promise<string[]> {
  const metrics = await fetchCustomerMetrics(userId);
  if (!metrics) return [];
  return evaluateCustomerSegments(metrics);
}

/**
 * Returns counts of customers in each segment.
 */
export async function getSegmentCounts(): Promise<Record<string, number>> {
  const allMetrics = await fetchAllCustomersMetrics();
  const counts: Record<string, number> = {
    "VIP Customers": 0,
    "Frequent Buyers": 0,
    "One-Time Buyers": 0,
    "Cart Abandoners": 0,
    "Wishlist Heavy Users": 0,
    "High Lifetime Value": 0,
    "New Customers": 0,
    "Inactive Customers": 0,
  };

  for (const metrics of allMetrics) {
    const segments = evaluateCustomerSegments(metrics);
    for (const segment of segments) {
      if (counts[segment] !== undefined) {
        counts[segment]++;
      }
    }
  }

  return counts;
}

/**
 * Returns the list of customer user IDs belonging to a specific segment.
 */
export async function getCustomersInSegment(segmentName: string): Promise<string[]> {
  const allMetrics = await fetchAllCustomersMetrics();
  const userIds: string[] = [];

  for (const metrics of allMetrics) {
    const segments = evaluateCustomerSegments(metrics);
    if (segments.includes(segmentName)) {
      userIds.push(metrics.id);
    }
  }

  return userIds;
}
