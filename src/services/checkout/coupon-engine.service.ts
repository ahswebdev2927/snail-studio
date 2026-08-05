import { db } from "@/db";
import { coupons, couponReservations, couponUsage, orders, customerTags, carts } from "@/db/schema";
import { eq, and, gt, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getCustomerSegments } from "@/services/crm/segmentation.service";

export interface CartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  categoryId?: string | null;
  collectionIds?: string[];
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: any;
  discountAmount?: number;
  eligibleSubtotal?: number;
  newTotal?: number;
}

/**
 * Evaluates whether a cart item is eligible for the coupon based on scope targets and exclusions.
 */
export function isItemEligibleForCoupon(
  item: { productId: string; categoryId?: string | null; collectionIds?: string[] },
  coupon: {
    applicableProducts?: string[] | null;
    applicableCategories?: string[] | null;
    applicableCollections?: string[] | null;
    excludedProducts?: string[] | null;
    excludedCategories?: string[] | null;
    excludedCollections?: string[] | null;
  }
): boolean {
  const {
    applicableProducts,
    applicableCategories,
    applicableCollections,
    excludedProducts,
    excludedCategories,
    excludedCollections,
  } = coupon;

  // 1. Exclusions check (takes precedence)
  if (excludedProducts && excludedProducts.includes(item.productId)) return false;
  if (excludedCategories && item.categoryId && excludedCategories.includes(item.categoryId)) return false;
  if (excludedCollections && item.collectionIds && item.collectionIds.some(cid => excludedCollections.includes(cid))) return false;

  // 2. Applicability check
  const hasProductTarget = applicableProducts && applicableProducts.length > 0;
  const hasCategoryTarget = applicableCategories && applicableCategories.length > 0;
  const hasCollectionTarget = applicableCollections && applicableCollections.length > 0;

  // If no targets are specified, it is eligible (store-wide scope)
  if (!hasProductTarget && !hasCategoryTarget && !hasCollectionTarget) return true;

  if (hasProductTarget && applicableProducts.includes(item.productId)) return true;
  if (hasCategoryTarget && item.categoryId && applicableCategories.includes(item.categoryId)) return true;
  if (hasCollectionTarget && item.collectionIds && item.collectionIds.some(cid => applicableCollections.includes(cid))) return true;

  return false;
}

/**
 * Validates the coupon code against customer eligibility, usage limits, and scope targets.
 */
export async function validateCoupon(
  code: string,
  subtotal: number, // in paise
  cartId?: string | null,
  userId?: string | null
): Promise<CouponValidationResult> {
  const normalizedCode = code.toUpperCase().trim();

  // 1. Load Coupon from DB
  let coupon = await db.query.coupons.findFirst({
    where: and(eq(coupons.code, normalizedCode), eq(coupons.isActive, true)),
  });

  // 2. Fallback to hardcoded promo codes if DB does not have it
  if (!coupon) {
    if (normalizedCode === "SNAILGLAM" || normalizedCode === "LUXENAILS10") {
      coupon = {
        id: `fallback_${normalizedCode.toLowerCase()}`,
        code: normalizedCode,
        discountType: "percentage",
        discountValue: 10, // 10% off
        minOrderAmount: 0,
        maxDiscountAmount: null,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2030-12-31"),
        usageLimit: null,
        usageCount: 0,
        isActive: true,
        applicableProducts: null,
        applicableCategories: null,
        applicableCollections: null,
        excludedProducts: null,
        excludedCategories: null,
        excludedCollections: null,
        customerEligibility: "everyone",
        eligibleUserIds: null,
        eligibleSegments: null,
        eligibleTags: null,
        perUserLimit: null,
        createdAt: new Date(),
      };
    }
  }

  if (!coupon) {
    return { valid: false, error: "Invalid coupon code or coupon has expired" };
  }

  // 3. Check Dates
  const now = new Date();
  if (coupon.startDate && now < new Date(coupon.startDate)) {
    return { valid: false, error: "Coupon is not active yet" };
  }
  if (coupon.endDate && now > new Date(coupon.endDate)) {
    return { valid: false, error: "Coupon has expired" };
  }

  // 4. Customer Eligibility
  if (coupon.customerEligibility && coupon.customerEligibility !== "everyone") {
    if (userId) {
      if (coupon.customerEligibility === "first_purchase") {
        const orderCount = await db
          .select({ count: sql<number>`count(${orders.id})`.mapWith(Number) })
          .from(orders)
          .where(
            and(
              eq(orders.userId, userId),
              inArray(orders.status, ["paid", "confirmed", "processing", "shipped", "delivered"])
            )
          )
          .then(res => res[0]?.count || 0);

        if (orderCount > 0) {
          return { valid: false, error: "This coupon is only valid for your first purchase." };
        }
      }

      if (coupon.customerEligibility === "returning") {
        const orderCount = await db
          .select({ count: sql<number>`count(${orders.id})`.mapWith(Number) })
          .from(orders)
          .where(
            and(
              eq(orders.userId, userId),
              inArray(orders.status, ["paid", "confirmed", "processing", "shipped", "delivered"])
            )
          )
          .then(res => res[0]?.count || 0);

        if (orderCount === 0) {
          return { valid: false, error: "This coupon is only valid for returning customers." };
        }
      }

      if (coupon.customerEligibility === "specific_users") {
        const allowedUsers = coupon.eligibleUserIds ? JSON.parse(coupon.eligibleUserIds) : [];
        if (!allowedUsers.includes(userId)) {
          return { valid: false, error: "This coupon is not assigned to your account." };
        }
      }

      if (coupon.customerEligibility === "segments") {
        const allowedSegments = coupon.eligibleSegments ? JSON.parse(coupon.eligibleSegments) : [];
        const userSegments = await getCustomerSegments(userId);
        const hasMatchingSegment = userSegments.some(seg => allowedSegments.includes(seg));
        if (!hasMatchingSegment) {
          return { valid: false, error: "This coupon is not valid for your customer account group." };
        }
      }

      if (coupon.customerEligibility === "tags") {
        const allowedTags = coupon.eligibleTags ? JSON.parse(coupon.eligibleTags) : [];
        const userTags = await db
          .select({ tag: customerTags.tag })
          .from(customerTags)
          .where(eq(customerTags.userId, userId))
          .then(res => res.map(r => r.tag));
        const hasMatchingTag = userTags.some(tag => allowedTags.includes(tag));
        if (!hasMatchingTag) {
          return { valid: false, error: "This coupon is not valid for your customer profile." };
        }
      }
    } else {
      if (["first_purchase", "returning", "specific_users", "segments", "tags"].includes(coupon.customerEligibility)) {
        return { valid: false, error: "Please log in to apply this user-restricted coupon." };
      }
    }
  }

  // 5. Usage Limits (with Active Reservation integration)
  if (coupon.usageLimit) {
    const confirmedCount = await db
      .select({ count: sql<number>`count(${orders.id})`.mapWith(Number) })
      .from(orders)
      .where(
        and(
          eq(orders.couponCode, coupon.code),
          inArray(orders.status, ["paid", "confirmed", "processing", "shipped", "delivered"])
        )
      )
      .then(res => res[0]?.count || 0);

    const activeReservationsCount = await db
      .select({ count: sql<number>`count(${couponReservations.id})`.mapWith(Number) })
      .from(couponReservations)
      .where(
        and(
          eq(couponReservations.couponId, coupon.id),
          gt(couponReservations.expiresAt, new Date())
        )
      )
      .then(res => res[0]?.count || 0);

    if (confirmedCount + activeReservationsCount >= coupon.usageLimit) {
      return { valid: false, error: "Coupon usage limit has been reached" };
    }
  }

  if (coupon.perUserLimit && userId) {
    const userConfirmedCount = await db
      .select({ count: sql<number>`count(${orders.id})`.mapWith(Number) })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.couponCode, coupon.code),
          inArray(orders.status, ["paid", "confirmed", "processing", "shipped", "delivered"])
        )
      )
      .then(res => res[0]?.count || 0);

    const userActiveReservationsCount = await db
      .select({ count: sql<number>`count(${couponReservations.id})`.mapWith(Number) })
      .from(couponReservations)
      .where(
        and(
          eq(couponReservations.couponId, coupon.id),
          eq(couponReservations.userId, userId),
          gt(couponReservations.expiresAt, new Date())
        )
      )
      .then(res => res[0]?.count || 0);

    if (userConfirmedCount + userActiveReservationsCount >= coupon.perUserLimit) {
      return { valid: false, error: "You have reached the per-user usage limit for this coupon" };
    }
  }

  // 6. Minimum subtotal check
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    const minAmountInRupees = (coupon.minOrderAmount / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });
    return {
      valid: false,
      error: `This coupon requires a minimum subtotal of ${minAmountInRupees}`,
    };
  }

  // 7. Scope targeting filtering
  let eligibleSubtotal = subtotal;
  let cartItemsList: CartItemInput[] = [];

  if (cartId) {
    // Load cart items with product details and collections
    const cartObj = await db.query.carts.findFirst({
      where: eq(carts.id, cartId),
      with: {
        items: {
          with: {
            variant: {
              with: {
                product: {
                  with: {
                    collections: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (cartObj && cartObj.items) {
      cartItemsList = cartObj.items.map((item: any) => ({
        productId: item.variant.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.variant.price,
        categoryId: item.variant.product.categoryId,
        collectionIds: item.variant.product.collections.map((pc: any) => pc.collectionId),
      }));

      // Parse coupon scope properties
      const couponScope = {
        applicableProducts: coupon.applicableProducts ? JSON.parse(coupon.applicableProducts) : null,
        applicableCategories: coupon.applicableCategories ? JSON.parse(coupon.applicableCategories) : null,
        applicableCollections: coupon.applicableCollections ? JSON.parse(coupon.applicableCollections) : null,
        excludedProducts: coupon.excludedProducts ? JSON.parse(coupon.excludedProducts) : null,
        excludedCategories: coupon.excludedCategories ? JSON.parse(coupon.excludedCategories) : null,
        excludedCollections: coupon.excludedCollections ? JSON.parse(coupon.excludedCollections) : null,
      };

      // Filter cart items based on scope rules
      const eligibleItems = cartItemsList.filter(item => isItemEligibleForCoupon(item, couponScope));
      
      // Calculate eligible items subtotal
      eligibleSubtotal = eligibleItems.reduce((acc, item) => acc + item.quantity * item.price, 0);

      if (eligibleItems.length === 0) {
        return {
          valid: false,
          error: "This coupon is not applicable to any items in your cart.",
        };
      }
    }
  }

  // 8. Calculate Discount
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = Math.floor((eligibleSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }
  } else if (coupon.discountType === "fixed") {
    discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
  }

  return {
    valid: true,
    coupon,
    discountAmount,
    eligibleSubtotal,
    newTotal: Math.max(0, subtotal - discountAmount),
  };
}

/**
 * Creates a temporary coupon slot reservation (default 15 minutes TTL) to prevent double-checkout race conditions.
 */
export async function reserveCoupon(
  couponId: string,
  orderId: string,
  userId?: string | null,
  tx?: any
): Promise<void> {
  const client = tx || db;
  const reservationId = `cres_${nanoid(10)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

  await client.insert(couponReservations).values({
    id: reservationId,
    couponId,
    orderId,
    userId: userId || null,
    expiresAt,
  });
}

/**
 * Converts an active reservation into a permanent redemption record in the coupon_usage table.
 */
export async function redeemCoupon(
  couponId: string,
  orderId: string,
  userId?: string | null,
  tx?: any
): Promise<void> {
  const client = tx || db;

  // 1. Delete matching reservations if they exist
  await client
    .delete(couponReservations)
    .where(and(eq(couponReservations.couponId, couponId), eq(couponReservations.orderId, orderId)));

  // 2. Write permanent log
  const usageId = `usg_${nanoid(10)}`;
  await client.insert(couponUsage).values({
    id: usageId,
    couponId,
    orderId,
    userId: userId || null,
  });
}

/**
 * Deletes any reservations linked to an orderId when checkouts are abandoned or payment fails.
 */
export async function releaseCouponReservation(orderId: string, tx?: any): Promise<void> {
  const client = tx || db;
  await client.delete(couponReservations).where(eq(couponReservations.orderId, orderId));
}
