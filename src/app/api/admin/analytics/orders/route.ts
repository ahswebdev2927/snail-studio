import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderStatusHistory } from "@/db/schema";
import { eq, and, gt, lte, inArray, sql } from "drizzle-orm";
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

    // 2. Query Orders in Timeframe
    const allOrdersInRange = await db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.createdAt
      })
      .from(orders)
      .where(
        and(
          gt(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      );

    const totalOrders = allOrdersInRange.length;

    // 3. Status Breakdown
    const statusBreakdown = {
      pending: 0,
      paid: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0
    };

    allOrdersInRange.forEach(o => {
      const status = o.status as keyof typeof statusBreakdown;
      if (statusBreakdown[status] !== undefined) {
        statusBreakdown[status]++;
      }
    });

    // 4. Fulfillment Calculations
    // Paid checkouts: everything except pending and cancelled
    const paidCount = statusBreakdown.paid + statusBreakdown.processing + statusBreakdown.shipped + statusBreakdown.delivered + statusBreakdown.refunded;
    const fulfillmentRate = paidCount > 0 ? (statusBreakdown.delivered / paidCount) * 100 : 0;
    const pendingFulfillmentCount = statusBreakdown.paid + statusBreakdown.processing + statusBreakdown.shipped;

    // 5. Fulfillment Velocity (Avg time between order creation and delivered history log)
    const deliveredOrders = await db
      .select({
        createdAt: orders.createdAt,
        deliveredAt: orderStatusHistory.createdAt
      })
      .from(orders)
      .innerJoin(orderStatusHistory, and(
        eq(orders.id, orderStatusHistory.orderId),
        eq(orderStatusHistory.status, "delivered")
      ))
      .where(
        and(
          gt(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      );

    let totalFulfillmentTimeMs = 0;
    deliveredOrders.forEach(o => {
      const diff = o.deliveredAt.getTime() - o.createdAt.getTime();
      totalFulfillmentTimeMs += diff;
    });

    const averageFulfillmentHours = deliveredOrders.length > 0
      ? (totalFulfillmentTimeMs / deliveredOrders.length) / (1000 * 60 * 60)
      : 0;

    // 6. Setup Daily or Monthly Trends Array
    const isMonthlyGrouping = range === "ytd" || range === "all";
    const groupFormat = isMonthlyGrouping ? "%Y-%m" : "%Y-%m-%d";

    const history: { date: string; count: number }[] = [];

    if (isMonthlyGrouping) {
      const current = new Date(startDate);
      while (current <= endDate) {
        const periodStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        history.push({ date: periodStr, count: 0 });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      if (daysDiff <= 366) {
        const current = new Date(startDate);
        while (current <= endDate) {
          const dateStr = current.toISOString().split("T")[0];
          history.push({ date: dateStr, count: 0 });
          current.setDate(current.getDate() + 1);
        }
      }
    }

    // Query daily or monthly order counts
    const dbOrdersTrend = await db
      .select({
        period: sql<string>`strftime(${groupFormat}, datetime(${orders.createdAt}, 'unixepoch'))`,
        count: sql<number>`count(*)`
      })
      .from(orders)
      .where(
        and(
          gt(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        )
      )
      .groupBy(sql`strftime(${groupFormat}, datetime(${orders.createdAt}, 'unixepoch'))`);

    // Map database order results to chronological history items
    dbOrdersTrend.forEach((row) => {
      const match = history.find((h) => h.date === row.period);
      if (match) {
        match.count = Number(row.count || 0);
      } else if (!isMonthlyGrouping) {
        history.push({ date: row.period, count: Number(row.count || 0) });
      }
    });

    return NextResponse.json({
      summary: {
        totalOrders,
        fulfillmentRate,
        averageFulfillmentHours,
        pendingFulfillmentCount,
        statusBreakdown
      },
      ordersHistory: history
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/analytics/orders error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
