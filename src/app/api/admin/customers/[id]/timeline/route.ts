import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { getCustomerTimeline } from "@/services/crm/timeline.service";

// GET /api/admin/customers/[id]/timeline - Retrieve paginated and filtered activity log events for a customer (Admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id } = await params;

    // Verify user exists and is a customer
    const customer = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!customer || customer.role !== "customer") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const type = searchParams.get("type") || "";

    // Fetch matching timeline events
    const allEvents = await getCustomerTimeline(id, customer.email, { type });

    const totalCount = allEvents.length;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;
    const paginatedEvents = allEvents.slice(offset, offset + limit);

    return NextResponse.json({
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/customers/[id]/timeline error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
