import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { redispatchOrderShipment } from "@/services/shipping/shipment-orchestration.service";
import { z } from "zod";

const redispatchSchema = z.object({
  provider: z.enum(["delhivery", "external"]).default("delhivery"),
  reason: z.string().min(3, "Reason for re-dispatch is required (minimum 3 characters)."),
  carrier: z.string().optional(),
  externalCourierName: z.string().optional(),
  externalTrackingNumber: z.string().optional(),
  externalTrackingUrl: z.string().optional(),
  externalMetadata: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Default fallback reason if no body provided
    }

    const parseRes = redispatchSchema.safeParse(body);
    const reason = parseRes.success ? parseRes.data.reason : "Manual AWB regeneration requested by admin";
    const provider = parseRes.success ? parseRes.data.provider : "delhivery";

    const redispatchResult = await redispatchOrderShipment({
      orderId,
      provider,
      reason,
      carrier: parseRes.success ? parseRes.data.carrier : undefined,
      externalCourierName: parseRes.success ? parseRes.data.externalCourierName : undefined,
      externalTrackingNumber: parseRes.success ? parseRes.data.externalTrackingNumber : undefined,
      externalTrackingUrl: parseRes.success ? parseRes.data.externalTrackingUrl : undefined,
      externalMetadata: parseRes.success ? parseRes.data.externalMetadata : undefined,
    });

    return NextResponse.json({
      message: "AWB regenerated / order re-dispatched successfully.",
      ...redispatchResult,
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/admin/orders/[id]/regenerate-awb error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to regenerate AWB" },
      { status: 400 }
    );
  }
}
