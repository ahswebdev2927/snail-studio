import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { createReplacementReplShipment } from "@/lib/returns/replacement";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * POST /api/admin/returns/[id]/create-repl
 * Triggers Delhivery REPL exchange shipment creation for an approved replacement request.
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

    const result = await createReplacementReplShipment({
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
      message: "Delhivery REPL exchange shipment created successfully",
      waybill: result.waybill,
      trackingUrl: result.trackingUrl,
      returnRequest: result.returnRequest,
    });
  } catch (error: any) {
    console.error("POST /api/admin/returns/[id]/create-repl error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create REPL exchange shipment" },
      { status: 500 }
    );
  }
}
