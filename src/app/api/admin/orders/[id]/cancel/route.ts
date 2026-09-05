import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { authorize } from "@/middleware/auth";
import { cancelAndRefundOrder } from "@/services/checkout/order.service";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().min(3, "Cancellation reason must be at least 3 characters long"),
  refundType: z.enum(["full", "custom"]).default("full"),
  refundAmountPaise: z.number().min(1).optional(),
});

// POST /api/admin/orders/[id]/cancel - Cancel Order and Process Refund (Admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = cancelSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { reason, refundType, refundAmountPaise } = result.data;

    // Privileged action check
    const { verifySensitiveAction, logAdminAudit } = await import("@/lib/auth/security");
    const securityCheck = await verifySensitiveAction(req, auth.user!, "cancel_order", null);
    if (!securityCheck.verified) {
      return securityCheck.errorResponse!;
    }

    const cancelResult = await cancelAndRefundOrder({
      orderId,
      reason,
      refundType,
      refundAmountPaise,
      adminId: auth.user!.id,
      adminName: auth.user!.name || auth.user!.phoneNumber,
    });

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const browser = req.headers.get("user-agent") || "Unknown";

    await logAdminAudit({
      adminId: auth.user!.id,
      adminName: auth.user!.name || auth.user!.phoneNumber,
      action: "cancel_and_refund_order",
      targetUserId: null,
      verificationStatus: "verified",
      ipAddress,
      browser,
    });

    revalidateTag(CACHE_TAGS.ORDERS, "max");
    revalidateTag(CACHE_TAGS.DASHBOARD, "max");
    revalidateTag(CACHE_TAGS.ANALYTICS, "max");

    return NextResponse.json(cancelResult, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/admin/orders/[id]/cancel error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel order and process refund" },
      { status: 400 }
    );
  }
}
