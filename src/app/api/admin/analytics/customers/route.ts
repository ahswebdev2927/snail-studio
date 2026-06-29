import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, orders } from "@/db/schema";
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
      // Find earliest customer signup date
      const earliestCustomer = await db
        .select({ createdAt: users.createdAt })
        .from(users)
        .where(eq(users.role, "customer"))
        .orderBy(users.createdAt)
        .limit(1)
        .then(res => res[0]);

      if (earliestCustomer) {
        startDate = new Date(earliestCustomer.createdAt.getTime());
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

    // 2. Query Customer Acquisition History (Time Series)
    const historyResults = await db
      .select({
        date: sql<string>`strftime('%Y-%m-%d', datetime(${users.createdAt}, 'unixepoch'))`,
        count: sql<number>`count(${users.id})`.mapWith(Number)
      })
      .from(users)
      .where(
        and(
          eq(users.role, "customer"),
          gt(users.createdAt, startDate),
          lte(users.createdAt, endDate)
        )
      )
      .groupBy(sql`strftime('%Y-%m-%d', datetime(${users.createdAt}, 'unixepoch'))`)
      .orderBy(sql`strftime('%Y-%m-%d', datetime(${users.createdAt}, 'unixepoch'))`);

    // Fill in date gaps for the line chart
    const historyMap = new Map<string, number>();
    historyResults.forEach(r => {
      if (r.date) historyMap.set(r.date, r.count);
    });

    const acquisitionHistory: { date: string; count: number }[] = [];
    const tempDate = new Date(startDate.getTime());
    while (tempDate <= endDate) {
      const dateString = tempDate.toISOString().split("T")[0];
      acquisitionHistory.push({
        date: dateString,
        count: historyMap.get(dateString) || 0
      });
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // 3. Query Lifetime Buyer Cohort Metrics
    const customerOrders = await db
      .select({
        userId: orders.userId,
        orderCount: sql<number>`count(${orders.id})`.mapWith(Number),
        totalSpent: sql<number>`sum(${orders.totalAmount})`.mapWith(Number)
      })
      .from(orders)
      .where(
        and(
          inArray(orders.status, ["paid", "processing", "shipped", "delivered"]),
          sql`${orders.userId} is not null`
        )
      )
      .groupBy(orders.userId);

    const totalBuyers = customerOrders.length;
    const repeatBuyers = customerOrders.filter(c => c.orderCount > 1).length;
    const repeatPurchaseRate = totalBuyers > 0 ? (repeatBuyers / totalBuyers) * 100 : 0;

    const totalSpentSum = customerOrders.reduce((sum, c) => sum + c.totalSpent, 0);
    const averageLTV = totalBuyers > 0 ? totalSpentSum / totalBuyers : 0;

    const repeatBuyersTotalSpent = customerOrders
      .filter(c => c.orderCount > 1)
      .reduce((sum, c) => sum + c.totalSpent, 0);
    const returningRevenuePercent = totalSpentSum > 0 ? (repeatBuyersTotalSpent / totalSpentSum) * 100 : 0;

    // Total signups count
    const totalSignups = await db
      .select({ count: sql<number>`count(${users.id})`.mapWith(Number) })
      .from(users)
      .where(eq(users.role, "customer"))
      .then(res => res[0]?.count || 0);

    // Period specific signups count
    const periodSignups = acquisitionHistory.reduce((sum, h) => sum + h.count, 0);

    // 4. Query Top 10 VIP Spenders
    const topSpenders = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phoneNumber,
        orderCount: sql<number>`count(${orders.id})`.mapWith(Number),
        totalSpent: sql<number>`sum(${orders.totalAmount})`.mapWith(Number)
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(
        inArray(orders.status, ["paid", "processing", "shipped", "delivered"])
      )
      .groupBy(users.id)
      .orderBy(desc(sql`sum(${orders.totalAmount})`))
      .limit(10);

    return NextResponse.json({
      summary: {
        totalSignups,
        periodSignups,
        repeatPurchaseRate: Number(repeatPurchaseRate.toFixed(1)),
        averageLTV: Number(averageLTV.toFixed(0)),
        returningRevenueTotal: repeatBuyersTotalSpent,
        returningRevenuePercent: Number(returningRevenuePercent.toFixed(1))
      },
      acquisitionHistory,
      topSpenders: topSpenders.map(s => ({
        id: s.id,
        name: s.name || "Anonymous Client",
        email: s.email || "No email",
        phone: s.phone,
        orderCount: s.orderCount,
        totalSpent: Number(s.totalSpent || 0)
      }))
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/analytics/customers error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
