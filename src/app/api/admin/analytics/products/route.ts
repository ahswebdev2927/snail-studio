import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, productVariants, products, categories } from "@/db/schema";
import { eq, and, gt, lte, inArray, sum, desc, sql } from "drizzle-orm";
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
      // Find earliest order date
      const earliestOrder = await db
        .select({ createdAt: orders.createdAt })
        .from(orders)
        .orderBy(orders.createdAt)
        .limit(1)
        .then(res => res[0]);

      if (earliestOrder) {
        startDate = new Date(earliestOrder.createdAt.getTime());
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

    const activePaidStatuses = ["paid", "processing", "shipped", "delivered"] as const;

    // 2. Query Top Selling Products
    const topProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        categoryName: categories.name,
        quantitySold: sum(orderItems.quantity),
        revenue: sum(sql`${orderItems.quantity} * ${orderItems.price}`)
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          inArray(orders.status, activePaidStatuses),
          gt(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .groupBy(products.id)
      .orderBy(desc(sum(orderItems.quantity)))
      .limit(10);

    // 3. Query Top Selling Variants
    const topVariants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        name: productVariants.name,
        productName: products.name,
        quantitySold: sum(orderItems.quantity),
        revenue: sum(sql`${orderItems.quantity} * ${orderItems.price}`)
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          inArray(orders.status, activePaidStatuses),
          gt(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .groupBy(productVariants.id)
      .orderBy(desc(sum(orderItems.quantity)))
      .limit(10);

    // 4. Query Category Distribution
    const categoryDistribution = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        revenue: sum(sql`${orderItems.quantity} * ${orderItems.price}`),
        quantitySold: sum(orderItems.quantity)
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          inArray(orders.status, activePaidStatuses),
          gt(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .groupBy(categories.id)
      .orderBy(desc(sum(sql`${orderItems.quantity} * ${orderItems.price}`)));

    // 5. Query Trending Products (comparing range period vs previous period)
    const now = new Date();
    const rangeMs = now.getTime() - startDate.getTime();

    // Period A: startDate to now
    const periodAStart = startDate;
    const periodAEnd = now;

    // Period B: (startDate - rangeMs) to startDate
    const periodBStart = new Date(startDate.getTime() - rangeMs);
    const periodBEnd = startDate;

    let trendingLabel = "";
    if (range === "7d") trendingLabel = "7d vs previous 7d";
    else if (range === "30d") trendingLabel = "30d vs previous 30d";
    else if (range === "90d") trendingLabel = "90d vs previous 90d";
    else if (range === "ytd") trendingLabel = "YTD vs previous YTD";
    else if (range === "all") trendingLabel = "All Time vs previous period";
    else {
      const daysDiff = Math.ceil(rangeMs / (24 * 60 * 60 * 1000));
      trendingLabel = `${daysDiff}d vs previous ${daysDiff}d`;
    }

    const salesA = await db
      .select({
        productId: products.id,
        productName: products.name,
        slug: products.slug,
        quantity: sum(orderItems.quantity)
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          inArray(orders.status, activePaidStatuses),
          gt(orders.createdAt, periodAStart),
          lte(orders.createdAt, periodAEnd)
        )
      )
      .groupBy(products.id);

    const salesB = await db
      .select({
        productId: products.id,
        quantity: sum(orderItems.quantity)
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          inArray(orders.status, activePaidStatuses),
          gt(orders.createdAt, periodBStart),
          lte(orders.createdAt, periodBEnd)
        )
      )
      .groupBy(products.id);

    const trendingList = salesA.map(itemA => {
      const qtyA = Number(itemA.quantity || 0);
      const matchB = salesB.find(itemB => itemB.productId === itemA.productId);
      const qtyB = Number(matchB?.quantity || 0);

      let growthPercent = 0;
      if (qtyB > 0) {
        growthPercent = ((qtyA - qtyB) / qtyB) * 100;
      } else if (qtyA > 0) {
        growthPercent = qtyA * 100; // growth scoring from a zero base
      }

      return {
        id: itemA.productId,
        name: itemA.productName,
        slug: itemA.slug,
        qtyA,
        qtyB,
        growthPercent
      };
    });

    const topTrending = trendingList
      .filter(item => item.growthPercent > 0)
      .sort((a, b) => b.growthPercent - a.growthPercent)
      .slice(0, 5);

    return NextResponse.json({
      topProducts: topProducts.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        categoryName: p.categoryName || "Uncategorized",
        quantitySold: Number(p.quantitySold || 0),
        revenue: Number(p.revenue || 0)
      })),
      topVariants: topVariants.map(v => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        productName: v.productName,
        quantitySold: Number(v.quantitySold || 0),
        revenue: Number(v.revenue || 0)
      })),
      categoryDistribution: categoryDistribution.map(c => ({
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        quantitySold: Number(c.quantitySold || 0),
        revenue: Number(c.revenue || 0)
      })),
      trendingProducts: topTrending,
      trendingLabel
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/analytics/products error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
