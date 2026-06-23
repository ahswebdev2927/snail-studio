"use server";

import { db } from "@/db";
import { wishlists, wishlistItems, orders, orderItems, productVariants, reviews } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { nanoid } from "nanoid";

/**
 * Helper to get the current authenticated session user from cookies
 */
async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  if (!token) return null;
  return getSessionUser(token);
}

/**
 * Toggles a product in the database wishlist of the logged-in user.
 * Returns the new state (isWishlisted: boolean).
 */
export async function toggleWishlistDb(productId: string) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "guest" };
    }

    // Find or create wishlist for user
    let wishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.userId, user.id),
    });

    if (!wishlist) {
      const newWishlistId = nanoid();
      await db.insert(wishlists).values({
        id: newWishlistId,
        userId: user.id,
      });
      wishlist = { id: newWishlistId, userId: user.id, createdAt: new Date() };
    }

    // Check if item exists
    const existing = await db.query.wishlistItems.findFirst({
      where: and(
        eq(wishlistItems.wishlistId, wishlist.id),
        eq(wishlistItems.productId, productId)
      ),
    });

    if (existing) {
      // Remove it
      await db
        .delete(wishlistItems)
        .where(
          and(
            eq(wishlistItems.wishlistId, wishlist.id),
            eq(wishlistItems.productId, productId)
          )
        );
      return { success: true, isWishlisted: false };
    } else {
      // Add it
      await db.insert(wishlistItems).values({
        wishlistId: wishlist.id,
        productId,
      });
      return { success: true, isWishlisted: true };
    }
  } catch (error: any) {
    console.error("Error toggling database wishlist:", error);
    return { success: false, error: error.message || "Internal server error" };
  }
}

/**
 * Merges local storage items with database wishlist and returns the final merged list.
 */
export async function syncWishlistDb(localProductIds: string[]) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "guest" };
    }

    // Find or create wishlist for user
    let wishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.userId, user.id),
    });

    if (!wishlist) {
      const newWishlistId = nanoid();
      await db.insert(wishlists).values({
        id: newWishlistId,
        userId: user.id,
      });
      wishlist = { id: newWishlistId, userId: user.id, createdAt: new Date() };
    }

    // Fetch existing wishlist items
    const dbItems = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.wishlistId, wishlist.id),
    });
    const dbProductIds = dbItems.map((item) => item.productId);

    // Merge any missing local items into DB
    const missingInDb = localProductIds.filter((id) => !dbProductIds.includes(id));
    if (missingInDb.length > 0) {
      const insertValues = missingInDb.map((productId) => ({
        wishlistId: wishlist!.id,
        productId,
      }));
      await db.insert(wishlistItems).values(insertValues);
    }

    // Fetch final merged list
    const finalItems = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.wishlistId, wishlist.id),
    });
    const mergedIds = finalItems.map((item) => item.productId);

    return { success: true, wishlist: mergedIds };
  } catch (error: any) {
    console.error("Error syncing database wishlist:", error);
    return { success: false, error: error.message || "Internal server error" };
  }
}

/**
 * Submits a new customer review for a product after checking delivery status and the 2-hour delay.
 */
export async function submitProductReview(
  productId: string,
  rating: number,
  title: string,
  comment: string
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "You must be logged in to submit a review." };
    }

    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating must be between 1 and 5 stars." };
    }

    if (!title.trim()) {
      return { success: false, error: "Review title is required." };
    }

    if (!comment.trim()) {
      return { success: false, error: "Review comment body is required." };
    }

    // 1. Get all variant IDs for this product
    const variantsList = await db.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
    });
    const variantIds = variantsList.map((v) => v.id);

    if (variantIds.length === 0) {
      return { success: false, error: "No product variants found to verify purchase." };
    }

    // 2. Query any orders for this user containing any of these variants
    const userOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, user.id),
          inArray(orderItems.variantId, variantIds)
        )
      );

    if (userOrders.length === 0) {
      return {
        success: false,
        error: "Only verified buyers who have purchased this product can write a review.",
      };
    }

    // 3. Find if any of these orders are delivered, and check delivery timestamp
    const deliveredOrders = userOrders.filter((o) => o.status === "delivered");

    if (deliveredOrders.length === 0) {
      // User purchased it, but it hasn't been delivered
      return {
        success: false,
        error: "Your order for this product is not marked as delivered yet. You can submit a review once your package arrives.",
      };
    }

    // Find the most recent delivery
    const mostRecentDelivery = deliveredOrders.reduce((latest, current) => {
      return current.updatedAt > latest.updatedAt ? current : latest;
    }, deliveredOrders[0]);

    const timeDiff = Date.now() - mostRecentDelivery.updatedAt.getTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    if (timeDiff < TWO_HOURS) {
      const minutesRemaining = Math.ceil((TWO_HOURS - timeDiff) / (60 * 1000));
      return {
        success: false,
        error: `Your order was delivered recently. Please wait ${minutesRemaining} more minute(s) to write a review.`,
      };
    }

    // 4. Save review in database
    await db.insert(reviews).values({
      id: nanoid(),
      productId,
      userId: user.id,
      rating,
      title,
      comment,
      isApproved: false, // Moderated by default
    });

    return {
      success: true,
      message: "Thank you! Your review has been submitted and is awaiting approval.",
    };
  } catch (error: any) {
    console.error("Error submitting review:", error);
    return { success: false, error: error.message || "Failed to submit review" };
  }
}
