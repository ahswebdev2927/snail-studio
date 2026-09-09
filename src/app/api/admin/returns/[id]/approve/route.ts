import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { approveReturnRequestSchema } from "@/lib/returns/types";
import { reviewReturnRequest } from "@/lib/returns/admin";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * POST /api/admin/returns/[id]/approve
 * Approve a pending return request and assign operational payment responsibility.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const { id: requestId } = await params;
    if (!requestId) {
      return NextResponse.json({ success: false, error: "Return request ID is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = approveReturnRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues || (parseResult.error as any).errors;
      const errorMsg = issues?.[0]?.message || "Invalid approval payload";
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const result = await reviewReturnRequest({
      requestId,
      action: "APPROVE",
      paymentResponsibility: parseResult.data.paymentResponsibility,
      adminNotes: parseResult.data.adminNotes,
      adminUser: auth.user,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400 }
      );
    }

    try {
      revalidateTag(CACHE_TAGS.ORDERS, "max");
      revalidateTag(CACHE_TAGS.DASHBOARD, "max");
    } catch {
      // Ignore cache revalidation errors in non-Next server environments
    }

    return NextResponse.json({
      success: true,
      message: "Return request approved successfully",
      returnRequest: result.returnRequest,
    });
  } catch (error: any) {
    console.error("POST /api/admin/returns/[id]/approve error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to approve return request" },
      { status: 500 }
    );
  }
}
