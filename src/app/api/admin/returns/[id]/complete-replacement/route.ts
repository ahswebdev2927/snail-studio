import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { markReplacementCompleted } from "@/lib/returns/replacement";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * POST /api/admin/returns/[id]/complete-replacement
 * Marks a replacement exchange request as COMPLETED.
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
      return NextResponse.json({ success: false, error: "Replacement request ID is required" }, { status: 400 });
    }

    const result = await markReplacementCompleted({
      requestId,
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
      message: "Replacement request marked as completed successfully",
      returnRequest: result.returnRequest,
    });
  } catch (error: any) {
    console.error("POST /api/admin/returns/[id]/complete-replacement error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to complete replacement request" },
      { status: 500 }
    );
  }
}
