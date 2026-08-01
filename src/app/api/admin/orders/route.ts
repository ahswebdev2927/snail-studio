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

    const pageVal = searchParams.get("page");
    const page = pageVal ? Math.max(1, parseInt(pageVal, 10)) : null;
    const limitVal = searchParams.get("limit");
    const limit = limitVal ? Math.max(1, parseInt(limitVal, 10)) : (page ? 25 : null);
    const offset = page && limit ? (page - 1) * limit : null;

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

    let totalItems = 0;
    if (page !== null && limit !== null) {
      const countBuilder = db
        .select({ count: sql<number>`count(${orders.id})` })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id));
      
      if (conditions.length > 0) {
        countBuilder.where(and(...conditions));
      }
      const countResult = await countBuilder;
      totalItems = countResult[0]?.count || 0;
    }

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

    if (conditions.length > 0) {
      queryBuilder.where(and(...conditions));
    }

    queryBuilder.orderBy(desc(orders.createdAt));

    if (limit !== null) {
      queryBuilder.limit(limit);
    }
    if (offset !== null) {
      queryBuilder.offset(offset);
    }

    const results = await queryBuilder;

    if (page !== null && limit !== null) {
      return NextResponse.json({
        orders: results,
        pagination: {
          totalItems,
          page,
          limit,
          totalPages: Math.ceil(totalItems / limit),
        }
      }, { status: 200 });
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/orders error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
