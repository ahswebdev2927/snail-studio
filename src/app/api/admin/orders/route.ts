import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { eq, and, or, like, desc, sql } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// GET /api/admin/orders - Retrieve list of orders with filters and customer details (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const q = searchParams.get("q") || "";

    const queryBuilder = db
      .select({
        id: orders.id,
        userId: orders.userId,
        status: orders.status,
        totalAmount: orders.totalAmount,
        couponCode: orders.couponCode,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customerName: users.name,
        customerPhone: users.phoneNumber,
        customerEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id));

    const conditions = [];

    // Filter by status
    if (status !== "all") {
      conditions.push(eq(orders.status, status as any));
    }

    // Search query (Order ID, Customer Name, or Phone Number)
    if (q.trim()) {
      const searchVal = `%${q.trim()}%`;
      conditions.push(
        or(
          like(orders.id, searchVal),
          like(users.name, searchVal),
          like(users.phoneNumber, searchVal)
        )
      );
    }

    if (conditions.length > 0) {
      queryBuilder.where(and(...conditions));
    }

    queryBuilder.orderBy(desc(orders.createdAt));

    const results = await queryBuilder;

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
