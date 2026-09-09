import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { returnRequests } from "@/db/schema";
import { authorize } from "@/middleware/auth";

/**
 * GET /api/admin/returns
 * List return and replacement requests with filtering and pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search") || searchParams.get("q");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    const allRequests = await db.query.returnRequests.findMany({
      with: {
        order: {
          with: {
            addresses: true,
          },
        },
        customer: true,
        orderItem: {
          with: {
            variant: {
              with: {
                product: true,
              },
            },
          },
        },
        replacementProduct: true,
        replacementVariant: true,
        reviewer: true,
      },
      orderBy: (rr, { desc }) => [desc(rr.createdAt)],
    });

    let filtered = allRequests;

    if (status && status !== "all") {
      filtered = filtered.filter((r) => r.status === status);
    }

    if (type && type !== "all") {
      filtered = filtered.filter((r) => r.type === type);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((r) => {
        const matchesOrderId = r.orderId.toLowerCase().includes(q);
        const matchesCustomerName = r.customer?.name?.toLowerCase().includes(q) || false;
        const matchesCustomerPhone = r.customer?.phoneNumber?.toLowerCase().includes(q) || false;
        const matchesWaybill = r.waybill?.toLowerCase().includes(q) || false;
        return matchesOrderId || matchesCustomerName || matchesCustomerPhone || matchesWaybill;
      });
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      returnRequests: paginated,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/returns error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch return requests" },
      { status: 500 }
    );
  }
}
