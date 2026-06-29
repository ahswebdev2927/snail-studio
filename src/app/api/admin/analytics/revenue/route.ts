import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, refunds } from "@/db/schema";
import { eq, and, gt, lte, inArray, sum, sql } from "drizzle-orm";
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
      // Find the earliest order date in the DB
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

    // Convert JavaScript Dates to SQLite unixepoch seconds
    const startEpoch = Math.floor(startDate.getTime() / 1000);
    const endEpoch = Math.floor(endDate.getTime() / 1000);

    const activePaidStatuses = ["paid", "processing", "shipped", "delivered"] as const;

    // 2. Fetch Aggregated Metrics
    const orderMetrics = await db
      .select({
        grossRevenue: sum(orders.totalAmount),
        taxAmount: sum(orders.taxAmount),
        shippingAmount: sum(orders.shippingAmount),
        discountAmount: sum(orders.discountAmount),
        orderCount: sql<number>`count(*)`
      })
      .from(orders)
      .where(
        and(
          inArray(orders.status, activePaidStatuses),
          gt(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .then(res => res[0] || { grossRevenue: null, taxAmount: null, shippingAmount: null, discountAmount: null, orderCount: 0 });

    const grossRevenue = Number(orderMetrics.grossRevenue || 0);
    const taxAmount = Number(orderMetrics.taxAmount || 0);
    const shippingAmount = Number(orderMetrics.shippingAmount || 0);
    const discountAmount = Number(orderMetrics.discountAmount || 0);
    const orderCount = Number(orderMetrics.orderCount || 0);

    // 3. Fetch Refunds
    const refundMetrics = await db
      .select({
        refundsTotal: sum(refunds.amount)
      })
      .from(refunds)
      .where(
        and(
          eq(refunds.status, "succeeded"),
          gt(refunds.createdAt, startDate),
          lte(refunds.createdAt, endDate)
        )
      )
      .then(res => res[0] || { refundsTotal: null });

    const refundsTotal = Number(refundMetrics.refundsTotal || 0);
    const netRevenue = grossRevenue - refundsTotal;
    const aov = orderCount > 0 ? netRevenue / orderCount : 0;

    // 4. Setup daily or monthly trends array
    const isMonthlyGrouping = range === "ytd" || range === "all";
    const groupFormat = isMonthlyGrouping ? "%Y-%m" : "%Y-%m-%d";

    const history: { date: string; amount: number; count: number }[] = [];

    if (isMonthlyGrouping) {
      const current = new Date(startDate);
      while (current <= endDate) {
        const periodStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        history.push({ date: periodStr, amount: 0, count: 0 });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      if (daysDiff <= 366) {
        const current = new Date(startDate);
        while (current <= endDate) {
          const dateStr = current.toISOString().split("T")[0];
          history.push({ date: dateStr, amount: 0, count: 0 });
          current.setDate(current.getDate() + 1);
        }
      }
    }

    // Query daily or monthly sums
    const dbSales = await db
      .select({
        period: sql<string>`strftime(${groupFormat}, datetime(${orders.createdAt}, 'unixepoch'))`,
        amount: sum(orders.totalAmount),
        count: sql<number>`count(*)`
      })
      .from(orders)
      .where(
        and(
          inArray(orders.status, activePaidStatuses),
          gt(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .groupBy(sql`strftime(${groupFormat}, datetime(${orders.createdAt}, 'unixepoch'))`);

    // Map database sales results to chronological history items
    dbSales.forEach((row) => {
      const match = history.find((h) => h.date === row.period);
      if (match) {
        match.amount = Number(row.amount || 0);
        match.count = Number(row.count || 0);
      } else if (!isMonthlyGrouping) {
        history.push({ date: row.period, amount: Number(row.amount || 0), count: Number(row.count || 0) });
      }
    });

    return NextResponse.json({
      summary: {
        grossRevenue,
        refundsTotal,
        netRevenue,
        aov,
        taxAmount,
        shippingAmount,
        discountAmount,
        orderCount
      },
      salesHistory: history
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/analytics/revenue error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
