"use server";

import { db } from "@/db";
import { products, wishlists, wishlistItems, reviews } from "@/db/schema";
import { eq, inArray, sql, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";


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
 * Fetches full product details for a list of product IDs (for guests) 
 * or for the authenticated user's wishlist stored in the database.
 */
export async function getWishlistProducts(localProductIds?: string[]) {
  try {
    const user = await getAuthUser();
    let productIds: string[] = [];

    if (user) {
      // Find the user's wishlist
      const userWishlist = await db.query.wishlists.findFirst({
        where: eq(wishlists.userId, user.id),
        with: {
          items: true,
        },
      });

      if (userWishlist && userWishlist.items.length > 0) {
        productIds = userWishlist.items.map((item) => item.productId);
      }
    } else if (localProductIds && localProductIds.length > 0) {
      productIds = localProductIds;
    }

    if (productIds.length === 0) {
      return { success: true, products: [] };
    }

    // Fetch the products matching the IDs
    const dbProducts = await db.query.products.findMany({
      where: inArray(products.id, productIds),
      with: {
        brand: true,
        category: true,
        variants: {
          with: {
            attributes: {
              with: {
                attributeValue: {
                  with: { group: true },
                },
              },
            },
          },
        },
        media: {
          with: {
            media: true,
          },
          orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
        },
      },
    });

    // Fetch approved reviews stats for these products to aggregate average rating and count
    const reviewsData = await db
      .select({
        productId: reviews.productId,
        avgRating: sql<number>`avg(${reviews.rating})`,
        count: sql<number>`count(${reviews.id})`,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.isApproved, true),
          inArray(reviews.productId, productIds)
        )
      )
      .groupBy(reviews.productId);

    const reviewsMap = new Map(reviewsData.map((r) => [r.productId, r]));

    // Format the database records to match the product cards schema
    const formattedProducts = dbProducts.map((p) => {
      // Calculate min/max price from variants (stored in paise)
      const prices = p.variants.map((v) => v.price);
      const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
      const priceMax = prices.length > 0 ? Math.max(...prices) : 0;

      // Extract ratings using the same aggregate fallback formula as search catalog
      const reviewsStats = reviewsMap.get(p.id);
      const reviewsCount = reviewsStats ? reviewsStats.count : 10 + (p.name.charCodeAt(p.name.length - 1) % 45);
      const ratingVal = reviewsStats ? Number(reviewsStats.avgRating) : 4.5 + (p.name.charCodeAt(0) % 6) * 0.1;
      const roundedRating = Number(ratingVal.toFixed(1));

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        priceMin,
        priceMax,
        isBestSeller: p.isBestSeller,
        isNewArrival: p.isFeatured, // Mapping isFeatured to isNewArrival as done on storefront
        rating: roundedRating,
        reviewsCount,
        reviewCount: reviewsCount, // Support both naming keys
        media: p.media,
        variants: p.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          price: v.price,
          status: v.status,
          attributes: v.attributes?.map((va) => ({
            groupCode: va.attributeValue?.group?.code,
            groupName: va.attributeValue?.group?.name,
            valueCode: va.attributeValue?.code,
            valueName: va.attributeValue?.value,
          })) || [],
        })),
      };
    });

    // Sort to match the requested productIds order (for guest local storage ordering)
    const orderedProducts = productIds
      .map((id) => formattedProducts.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p);

    return { success: true, products: orderedProducts };
  } catch (error: any) {
    console.error("Error in getWishlistProducts:", error);
    return { success: false, error: error.message || "Failed to fetch wishlist products" };
  }
}
