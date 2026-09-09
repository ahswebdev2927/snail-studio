import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { createReturnReversePickup } from "@/lib/returns/reverse-pickup";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * POST /api/admin/returns/[id]/create-pickup
 * Triggers Delhivery reverse pickup creation for an approved return request.
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

    const result = await createReturnReversePickup({
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
      message: "Reverse pickup created successfully",
      waybill: result.waybill,
      trackingUrl: result.trackingUrl,
      returnRequest: result.returnRequest,
    });
  } catch (error: any) {
    console.error("POST /api/admin/returns/[id]/create-pickup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create reverse pickup" },
      { status: 500 }
    );
  }
}
