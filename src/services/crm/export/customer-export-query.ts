import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, or, like, sql, inArray, desc, asc, not } from "drizzle-orm";
import { CustomerFilterGroup, CustomerSelection, CustomerFilterCondition } from "./customer-export.types";
import { getCustomersInSegment } from "../segmentation.service";

// Map user-friendly segment names to database evaluateCustomerSegments names
const SEGMENT_NAME_MAP: Record<string, string> = {
  "VIP": "VIP Customers",
  "VIP Customers": "VIP Customers",
  "Frequent Buyer": "Frequent Buyers",
  "Frequent Buyers": "Frequent Buyers",
  "One-Time Buyer": "One-Time Buyers",
  "One-Time Buyers": "One-Time Buyers",
  "Cart Abandoner": "Cart Abandoners",
  "Cart Abandoners": "Cart Abandoners",
  "Wishlist Heavy User": "Wishlist Heavy Users",
  "Wishlist Heavy Users": "Wishlist Heavy Users",
  "High Lifetime Value": "High Lifetime Value",
  "New Customer": "New Customers",
  "New Customers": "New Customers",
  "Inactive Customer": "Inactive Customers",
  "Inactive Customers": "Inactive Customers"
};

/**
 * Returns a Drizzle Select query that computes all CRM fields using SQLite subqueries.
 * Outer table column references are written as raw SQL 'users.id' / 'users.email' to prevent
 * Drizzle column translation ambiguous 'id' compilation errors.
 * Each raw sql expression has `.as('fieldKey')` appended to serve as a subquery column reference.
 */
export function getBaseCustomerQuery() {
  return db
    .select({
      customerId: users.id,
      name: users.name,
      email: users.email,
      phoneNumber: users.phoneNumber,
      whatsappNumber: users.whatsappNumber,
      accountStatus: sql<string>`CASE WHEN ${users.isActive} = 1 THEN 'Active' ELSE 'Banned' END`.as("accountStatus"),
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
      
      // Orders & Revenue Group
      totalOrders: sql<number>`COALESCE((SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id), 0)`.mapWith(Number).as("totalOrders"),
      completedOrders: sql<number>`COALESCE((SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id AND orders.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')), 0)`.mapWith(Number).as("completedOrders"),
      cancelledOrders: sql<number>`COALESCE((SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id AND orders.status = 'cancelled'), 0)`.mapWith(Number).as("cancelledOrders"),
      lifetimeValue: sql<number>`COALESCE((SELECT SUM(orders.total_amount) FROM orders WHERE orders.user_id = users.id AND orders.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')), 0)`.mapWith(Number).as("lifetimeValue"),
      averageOrderValue: sql<number>`COALESCE(
        (SELECT SUM(orders.total_amount) FROM orders WHERE orders.user_id = users.id AND orders.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')) / 
        (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id AND orders.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')),
        0
      )`.mapWith(Number).as("averageOrderValue"),
      firstOrderDate: sql<number | null>`(SELECT MIN(orders.created_at) FROM orders WHERE orders.user_id = users.id)`.as("firstOrderDate"),
      lastOrderDate: sql<number | null>`(SELECT MAX(orders.created_at) FROM orders WHERE orders.user_id = users.id)`.as("lastOrderDate"),

      // Engagement Group
      wishlistCount: sql<number>`COALESCE((SELECT COUNT(*) FROM wishlist_items JOIN wishlists ON wishlist_items.wishlist_id = wishlists.id WHERE wishlists.user_id = users.id), 0)`.mapWith(Number).as("wishlistCount"),
      recentlyViewedCount: sql<number>`COALESCE((SELECT COUNT(*) FROM recently_viewed WHERE recently_viewed.user_id = users.id), 0)`.mapWith(Number).as("recentlyViewedCount"),
      searchCount: sql<number>`COALESCE((SELECT COUNT(*) FROM search_logs WHERE search_logs.user_id = users.id), 0)`.mapWith(Number).as("searchCount"),
      
      favoriteShape: sql<string>`COALESCE((
        SELECT av.value
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN product_variants pv ON oi.variant_id = pv.id
        JOIN variant_attribute_values vav ON pv.id = vav.variant_id
        JOIN attribute_values av ON vav.attribute_value_id = av.id
        JOIN attribute_groups ag ON av.group_id = ag.id
        WHERE o.user_id = users.id
          AND o.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
          AND ag.code = 'shape'
        GROUP BY av.id
        ORDER BY count(*) DESC
        LIMIT 1
      ), 'None yet')`.as("favoriteShape"),

      favoriteLength: sql<string>`COALESCE((
        SELECT av.value
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN product_variants pv ON oi.variant_id = pv.id
        JOIN variant_attribute_values vav ON pv.id = vav.variant_id
        JOIN attribute_values av ON vav.attribute_value_id = av.id
        JOIN attribute_groups ag ON av.group_id = ag.id
        WHERE o.user_id = users.id
          AND o.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
          AND ag.code = 'length'
        GROUP BY av.id
        ORDER BY count(*) DESC
        LIMIT 1
      ), 'None yet')`.as("favoriteLength"),

      favoriteCategory: sql<string>`COALESCE((
        SELECT c.name
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN product_variants pv ON oi.variant_id = pv.id
        JOIN products p ON pv.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        WHERE o.user_id = users.id
          AND o.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
        GROUP BY c.id
        ORDER BY count(*) DESC
        LIMIT 1
      ), 'None yet')`.as("favoriteCategory"),

      favoriteCollection: sql<string>`COALESCE((
        SELECT col.name
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN product_variants pv ON oi.variant_id = pv.id
        JOIN products p ON pv.product_id = p.id
        JOIN product_collections pc ON p.id = pc.product_id
        JOIN collections col ON pc.collection_id = col.id
        WHERE o.user_id = users.id
          AND o.status IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
        GROUP BY col.id
        ORDER BY count(*) DESC
        LIMIT 1
      ), 'None yet')`.as("favoriteCollection"),

      // Marketing Group
      marketingConsent: sql<string>`CASE WHEN ${users.marketingConsent} = 1 THEN 'Yes' ELSE 'No' END`.as("marketingConsent"),
      customerTags: sql<string>`COALESCE((SELECT group_concat(tag, ', ') FROM customer_tags WHERE customer_tags.user_id = users.id), '')`.as("customerTags"),
      couponsUsed: sql<number>`COALESCE((SELECT COUNT(*) FROM coupon_usage WHERE coupon_usage.user_id = users.id), 0)`.mapWith(Number).as("couponsUsed"),
      launchSubscriptions: sql<number>`COALESCE((SELECT COUNT(*) FROM launch_subscribers WHERE launch_subscribers.email = users.email), 0)`.mapWith(Number).as("launchSubscriptions")
    })
    .from(users)
    .where(eq(users.role, "customer"));
}

/**
 * Translates a single filter condition from the builder configuration into a Drizzle SQLite expression.
 */
async function translateConditionToSql(subqueryAlias: any, cond: CustomerFilterCondition): Promise<any> {
  const { field, operator } = cond;
  let value = cond.value;

  // 1. Handle Special Case: Segment
  if (field === "segment") {
    const rawSegment = String(value);
    const mappedSegment = SEGMENT_NAME_MAP[rawSegment] || rawSegment;
    const userIds = await getCustomersInSegment(mappedSegment);
    
    if (operator === "is" || operator === "equals") {
      return userIds.length > 0 ? inArray(subqueryAlias.customerId, userIds) : sql`1 = 0`;
    } else if (operator === "isNot" || operator === "notEquals") {
      return userIds.length > 0 ? not(inArray(subqueryAlias.customerId, userIds)) : sql`1 = 1`;
    }
    return null;
  }

  // 2. Handle numeric/monetary conversions to numbers for SQLite type affinity safety
  const numericFields = [
    "totalOrders",
    "completedOrders",
    "cancelledOrders",
    "wishlistCount",
    "recentlyViewedCount",
    "searchCount",
    "couponsUsed",
    "launchSubscriptions"
  ];

  if (field === "lifetimeValue" || field === "averageOrderValue") {
    if (Array.isArray(value)) {
      value = value.map((v: any) => {
        const str = String(v).replace(/[₹$,]/g, "").trim();
        return Math.round(Number(str) * 100);
      });
    } else {
      if (typeof value === "string") {
        const numericString = value.replace(/[₹$,]/g, "").trim();
        value = Math.round(Number(numericString) * 100);
      } else if (typeof value === "number") {
        value = Math.round(value * 100);
      }
    }
  } else if (numericFields.includes(field)) {
    if (Array.isArray(value)) {
      value = value.map((v: any) => {
        const num = Number(v);
        return isNaN(num) ? 0 : num;
      });
    } else {
      const num = Number(value);
      value = isNaN(num) ? 0 : num;
    }
  }

  const column = subqueryAlias[field];
  if (!column) return null;

  // Translate operators
  switch (operator) {
    // Strings
    case "is":
    case "equals":
      return eq(column, value);
    case "isNot":
    case "notEquals":
      return not(eq(column, value));
    case "contains":
      return like(column, `%${value}%`);
    case "doesNotContain":
      return not(like(column, `%${value}%`));

    // Numbers
    case "greaterThan":
      return sql`${column} > ${value}`;
    case "greaterThanOrEqual":
      return sql`${column} >= ${value}`;
    case "lessThan":
      return sql`${column} < ${value}`;
    case "lessThanOrEqual":
      return sql`${column} <= ${value}`;
    case "between":
      if (Array.isArray(value) && value.length === 2) {
        let val1 = value[0];
        let val2 = value[1];
        if (field === "lifetimeValue" || field === "averageOrderValue") {
          val1 = Math.round(Number(val1) * 100);
          val2 = Math.round(Number(val2) * 100);
        }
        return sql`${column} BETWEEN ${val1} AND ${val2}`;
      }
      break;

    // Booleans
    case "isTrue":
      return eq(column, sql`1`);
    case "isFalse":
      return eq(column, sql`0`);

    // Dates (Stored as unix timestamps or Date objects in SQLite)
    case "before": {
      const ts = new Date(value).getTime() / 1000;
      // SQLite stores timestamps either in seconds or milliseconds. Handle both.
      return sql`CASE 
        WHEN ${column} < 10000000000 THEN ${column} < ${ts}
        ELSE ${column} < ${ts * 1000}
      END`;
    }
    case "after": {
      const ts = new Date(value).getTime() / 1000;
      return sql`CASE 
        WHEN ${column} < 10000000000 THEN ${column} > ${ts}
        ELSE ${column} > ${ts * 1000}
      END`;
    }
    case "on": {
      const start = new Date(value);
      start.setHours(0, 0, 0, 0);
      const end = new Date(value);
      end.setHours(23, 59, 59, 999);
      const tsStart = start.getTime() / 1000;
      const tsEnd = end.getTime() / 1000;
      return sql`CASE 
        WHEN ${column} < 10000000000 THEN ${column} BETWEEN ${tsStart} AND ${tsEnd}
        ELSE ${column} BETWEEN ${tsStart * 1000} AND ${tsEnd * 1000}
      END`;
    }
    case "dateBetween":
      if (Array.isArray(value) && value.length === 2) {
        const tsStart = new Date(value[0]).getTime() / 1000;
        const tsEnd = new Date(value[1]).getTime() / 1000;
        return sql`CASE 
          WHEN ${column} < 10000000000 THEN ${column} BETWEEN ${tsStart} AND ${tsEnd}
          ELSE ${column} BETWEEN ${tsStart * 1000} AND ${tsEnd * 1000}
        END`;
      }
      break;
    case "inLastDays": {
      const days = Number(value);
      const thresholdTs = (Date.now() - days * 24 * 60 * 60 * 1000) / 1000;
      return sql`CASE 
        WHEN ${column} < 10000000000 THEN ${column} >= ${thresholdTs}
        ELSE ${column} >= ${thresholdTs * 1000}
      END`;
    }
  }

  return null;
}

/**
 * Builds the complete list of WHERE query conditions for the subquery view.
 */
export async function buildQueryConditions(
  subqueryAlias: any,
  filters: CustomerFilterGroup,
  selection: CustomerSelection,
  search?: string
): Promise<any[]> {
  const conditions: any[] = [];

  // 1. Selection Mode Filtering
  if (selection.mode === "selected" && selection.selectedIds) {
    if (selection.selectedIds.length > 0) {
      conditions.push(inArray(subqueryAlias.customerId, selection.selectedIds));
    } else {
      // Force empty results if mode is selected but no IDs were chosen
      conditions.push(sql`1 = 0`);
    }
  }

  // 2. Text Search Filter (name, email, phone)
  if (search && search.trim()) {
    const searchVal = `%${search.trim()}%`;
    conditions.push(
      or(
        like(subqueryAlias.name, searchVal),
        like(subqueryAlias.email, searchVal),
        like(subqueryAlias.phoneNumber, searchVal)
      )
    );
  }

  // 3. Dynamic Filter Builder conditions
  const filterConditions: any[] = [];
  if (filters && filters.conditions) {
    for (const cond of filters.conditions) {
      const expr = await translateConditionToSql(subqueryAlias, cond);
      if (expr) {
        filterConditions.push(expr);
      }
    }
  }

  if (filterConditions.length > 0) {
    if (filters.operator === "OR") {
      conditions.push(or(...filterConditions));
    } else {
      conditions.push(and(...filterConditions));
    }
  }

  return conditions;
}
export { getCustomersInSegment };
