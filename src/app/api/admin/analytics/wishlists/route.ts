import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { wishlists, wishlistItems, products, categories, orders, orderItems, productVariants } from "@/db/schema";
import { eq, and, gt, lte, inArray, sql, desc } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize as Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "7d";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    let startDate: Date;
    let endDate = new Date();

    // Calculate dates based on range selection
    if (range === "7d") {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    } else if (range === "ytd") {
      startDate = new Date(new Date().getFullYear(), 0, 1);
    } else if (range === "all") {
      // Find earliest wishlist item date
      const earliestWishlist = await db
        .select({ createdAt: wishlists.createdAt })
        .from(wishlists)
        .orderBy(wishlists.createdAt)
        .limit(1)
        .then(res => res[0]);

      if (earliestWishlist) {
        startDate = new Date(earliestWishlist.createdAt.getTime());
      } else {
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      }
    } else if (range === "custom" && startDateStr) {
      startDate = new Date(startDateStr);
      if (endDateStr) {
        endDate = new Date(endDateStr);
      }
    } else {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // 2. Query Wishlist Adds History (Time Series)
    // Convert epoch seconds to date string: strftime('%Y-%m-%d', datetime(created_at, 'unixepoch'))
    const historyResults = await db
      .select({
        date: sql<string>`strftime('%Y-%m-%d', datetime(${wishlists.createdAt}, 'unixepoch'))`,
        count: sql<number>`count(${wishlistItems.productId})`.mapWith(Number)
      })
      .from(wishlistItems)
      .innerJoin(wishlists, eq(wishlistItems.wishlistId, wishlists.id))
      .where(
        and(
          gt(wishlists.createdAt, startDate),
          lte(wishlists.createdAt, endDate)
        )
      )
      .groupBy(sql`strftime('%Y-%m-%d', datetime(${wishlists.createdAt}, 'unixepoch'))`)
      .orderBy(sql`strftime('%Y-%m-%d', datetime(${wishlists.createdAt}, 'unixepoch'))`);

    // Fill in date gaps for the line chart
    const historyMap = new Map<string, number>();
    historyResults.forEach(r => {
      if (r.date) historyMap.set(r.date, r.count);
    });

    const wishlistHistory: { date: string; count: number }[] = [];
    const tempDate = new Date(startDate.getTime());
    while (tempDate <= endDate) {
      const dateString = tempDate.toISOString().split("T")[0];
      wishlistHistory.push({
        date: dateString,
        count: historyMap.get(dateString) || 0
      });
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // 3. Query Top Wishlisted Products in the Period
    const topWishlisted = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        categoryName: categories.name,
        addCount: sql<number>`count(${wishlistItems.productId})`.mapWith(Number)
      })
      .from(wishlistItems)
      .innerJoin(wishlists, eq(wishlistItems.wishlistId, wishlists.id))
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          gt(wishlists.createdAt, startDate),
          lte(wishlists.createdAt, endDate)
        )
      )
      .groupBy(products.id)
      .orderBy(desc(sql`count(${wishlistItems.productId})`))
      .limit(10);

    // 4. Calculate Wishlist-to-Purchase Conversions
    // Find all distinct user-product pairs who wishlisted in the period
    const wishlistPairs = await db
      .select({
        userId: wishlists.userId,
        productId: wishlistItems.productId
      })
      .from(wishlistItems)
      .innerJoin(wishlists, eq(wishlistItems.wishlistId, wishlists.id))
      .where(
        and(
          gt(wishlists.createdAt, startDate),
          lte(wishlists.createdAt, endDate)
        )
      );

    const totalPairsCount = wishlistPairs.length;
    const uniqueEngagedUsers = new Set(wishlistPairs.map(p => p.userId)).size;

    let convertedPairsCount = 0;
    let paidOrders: { userId: string | null; productId: string }[] = [];

    if (totalPairsCount > 0) {
      const userIds = Array.from(new Set(wishlistPairs.map(p => p.userId)));
      
      // Fetch matching purchases made by these users
      paidOrders = await db
        .select({
          userId: orders.userId,
          productId: productVariants.productId
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
        .where(
          and(
            inArray(orders.status, ["paid", "processing", "shipped", "delivered"]),
            inArray(orders.userId, userIds)
          )
        );

      wishlistPairs.forEach(pair => {
        const matchedPurchase = paidOrders.some(order => 
          order.userId === pair.userId && order.productId === pair.productId
        );
        if (matchedPurchase) {
          convertedPairsCount++;
        }
      });
    }

    const globalConversionRate = totalPairsCount > 0 ? (convertedPairsCount / totalPairsCount) * 100 : 0;

    // Attach conversion rates to top products list
    const topProducts = topWishlisted.map(prod => {
      const pairsForProduct = wishlistPairs.filter(p => p.productId === prod.id);
      const totalPairs = pairsForProduct.length;
      let convertedPairs = 0;

      pairsForProduct.forEach(pair => {
        const matchedPurchase = paidOrders.some(order => 
          order.userId === pair.userId && order.productId === pair.productId
        );
        if (matchedPurchase) {
          convertedPairs++;
        }
      });

      const conversionRate = totalPairs > 0 ? (convertedPairs / totalPairs) * 100 : 0;

      return {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        categoryName: prod.categoryName || "Uncategorized",
        addCount: prod.addCount,
        conversionRate: Number(conversionRate.toFixed(1))
      };
    });

    return NextResponse.json({
      summary: {
        totalWishlistAdds: totalPairsCount,
        uniqueEngagedUsers,
        globalConversionRate: Number(globalConversionRate.toFixed(1))
      },
      wishlistHistory,
      topWishlisted: topProducts
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/analytics/wishlists error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
