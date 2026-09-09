import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { returnRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

/**
 * GET /api/admin/returns/[id]
 * Fetch single return request details with full relational context.
 */
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
    if (!id) {
      return NextResponse.json({ success: false, error: "Return request ID is required" }, { status: 400 });
    }

    const request = await db.query.returnRequests.findFirst({
      where: eq(returnRequests.id, id),
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
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Return request not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, returnRequest: request });
  } catch (error: any) {
    console.error("GET /api/admin/returns/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch return request details" },
      { status: 500 }
    );
  }
}
