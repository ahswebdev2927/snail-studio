import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, users, inventoryItems } from "@/db/schema";
import { eq, and, or, gt, inArray, sum, sql } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// GET /api/admin/dashboard/stats - Fetch aggregated stats and sales history for Admin (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 1. Total Sales (INR paise sum of completed/active paid orders)
    const activePaidStatuses = ["paid", "processing", "shipped", "delivered"] as const;
    const salesResult = await db
      .select({ val: sum(orders.totalAmount) })
      .from(orders)
      .where(inArray(orders.status, activePaidStatuses));
    const totalSales = Number(salesResult[0]?.val || 0);

    // 2. Orders Count (all time)
    const ordersCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders);
    const totalOrders = ordersCountResult[0]?.count || 0;

    // 3. Customers Count (registered users with role 'customer')
    const customersCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "customer"));
    const totalCustomers = customersCountResult[0]?.count || 0;

    // 4. Low Stock Count
    const lowStockCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(sql`${inventoryItems.stockLevel} <= ${inventoryItems.lowStockThreshold}`);
    const lowStockCount = lowStockCountResult[0]?.count || 0;

    // 5. Recent Orders (last 5)
    const recentOrders = await db.query.orders.findMany({
      limit: 5,
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      with: {
        user: true, // Relation to retrieve customer details
      },
    });

    // 6. Real Low Stock Items List (up to 5)
    const lowStockItems = await db.query.inventoryItems.findMany({
      where: sql`${inventoryItems.stockLevel} <= ${inventoryItems.lowStockThreshold}`,
      limit: 5,
      with: {
        variant: {
          with: {
            product: true
          }
        }
      }
    });

    // 7. 7-Day Sales History (date-mapped array for analytical chart rendering)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const history: { date: string; amount: number }[] = [];
    
    // Seed the last 7 dates with 0 values
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];
      history.push({ date: dateStr, amount: 0 });
    }

    // Query daily sum from SQLite
    const dbSales = await db
      .select({
        date: sql<string>`strftime('%Y-%m-%d', datetime(created_at, 'unixepoch'))`,
        amount: sum(orders.totalAmount),
      })
      .from(orders)
      .where(
        and(
          inArray(orders.status, activePaidStatuses),
          gt(orders.createdAt, sevenDaysAgo)
        )
      )
      .groupBy(sql`strftime('%Y-%m-%d', datetime(created_at, 'unixepoch'))`);

    // Map database results to the seeded array
    dbSales.forEach((row) => {
      const match = history.find((h) => h.date === row.date);
      if (match) {
        match.amount = Number(row.amount || 0);
      }
    });

    return NextResponse.json({
      totalSales,
      totalOrders,
      totalCustomers,
      lowStockCount,
      recentOrders,
      lowStockItems: lowStockItems.map(item => ({
        sku: item.variant?.sku || "N/A",
        name: `${item.variant?.product?.name || "Product"} - ${item.variant?.name || "Variant"}`,
        stock: item.stockLevel,
      })),
      salesHistory: history
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/dashboard/stats error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
