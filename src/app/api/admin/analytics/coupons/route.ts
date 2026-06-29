import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, coupons } from "@/db/schema";
import { and, gt, lte, inArray, sql, desc, eq } from "drizzle-orm";
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
      // Find earliest order date with coupon code
      const earliestOrder = await db
        .select({ createdAt: orders.createdAt })
        .from(orders)
        .where(sql`${orders.couponCode} is not null`)
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

    // 2. Query Coupon Performances
    const performances = await db
      .select({
        code: orders.couponCode,
        usageCount: sql<number>`count(${orders.id})`.mapWith(Number),
        totalDiscount: sql<number>`sum(${orders.discountAmount})`.mapWith(Number),
        influencedRevenue: sql<number>`sum(${orders.totalAmount})`.mapWith(Number),
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
        isActive: coupons.isActive
      })
      .from(orders)
      .leftJoin(coupons, eq(orders.couponCode, coupons.code))
      .where(
        and(
          sql`${orders.couponCode} is not null`,
          inArray(orders.status, ["paid", "processing", "shipped", "delivered"]),
          gt(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .groupBy(orders.couponCode)
      .orderBy(desc(sql`sum(${orders.discountAmount})`));

    // 3. Compute Summary Metrics
    let totalDiscountValue = 0;
    let influencedRevenue = 0;
    let usageCount = 0;

    performances.forEach(p => {
      totalDiscountValue += p.totalDiscount || 0;
      influencedRevenue += p.influencedRevenue || 0;
      usageCount += p.usageCount || 0;
    });

    const avgDiscountPerOrder = usageCount > 0 ? totalDiscountValue / usageCount : 0;

    return NextResponse.json({
      summary: {
        totalDiscountValue,
        influencedRevenue,
        usageCount,
        avgDiscountPerOrder: Number(avgDiscountPerOrder.toFixed(0))
      },
      couponPerformances: performances.map(p => ({
        code: p.code || "Unknown Code",
        usageCount: p.usageCount,
        totalDiscount: Number(p.totalDiscount || 0),
        influencedRevenue: Number(p.influencedRevenue || 0),
        discountType: p.discountType || "fixed",
        discountValue: p.discountValue !== null && p.discountValue !== undefined ? p.discountValue : 0,
        isActive: p.isActive !== null && p.isActive !== undefined ? p.isActive : false
      }))
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/analytics/coupons error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
