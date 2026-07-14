import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { eq, and, or, like, desc, sql, inArray } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { getCustomersInSegment, getSegmentCounts } from "@/services/crm/segmentation.service";

// GET /api/admin/customers - Retrieve registered customers list with lifetime order statistics & segmentation (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const segment = searchParams.get("segment") || "";

    const segmentCounts = await getSegmentCounts();
    const conditions = [eq(users.role, "customer")];

    // Apply segment filter if requested
    if (segment.trim()) {
      const userIds = await getCustomersInSegment(segment.trim());
      if (userIds.length === 0) {
        return NextResponse.json({
          customers: [],
          segmentCounts,
        }, { status: 200 });
      }
      conditions.push(inArray(users.id, userIds));
    }

    // Apply text search on name, phone, or email if provided
    if (q.trim()) {
      const searchVal = `%${q.trim()}%`;
      conditions.push(
        or(
          like(users.name, searchVal),
          like(users.phoneNumber, searchVal),
          like(users.email, searchVal)
        ) as any
      );
    }

    const results = await db
      .select({
        id: users.id,
        name: users.name,
        phoneNumber: users.phoneNumber,
        whatsappNumber: users.whatsappNumber,
        email: users.email,
        image: users.image,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        totalOrders: sql<number>`COALESCE(COUNT(${orders.id}), 0)`.mapWith(Number),
        totalSpent: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`.mapWith(Number),
      })
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .where(and(...conditions))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({
      customers: results,
      segmentCounts,
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/customers error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
