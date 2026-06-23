"use server";

import { db } from "@/db";
import { wishlists, wishlistItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
