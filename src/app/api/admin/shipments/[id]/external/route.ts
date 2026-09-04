import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { updateExternalCourierDetails } from "@/services/shipping/shipment-orchestration.service";
import { z } from "zod";

const updateExternalCourierSchema = z.object({
  externalCourierName: z.string().optional(),
  trackingNumber: z.string().optional(),
  externalTrackingUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  externalMetadata: z.string().optional(),
});

// PATCH /api/admin/shipments/[id]/external - Update manual external courier info
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const { id: shipmentId } = await params;
    if (!shipmentId) {
      return NextResponse.json({ error: "Shipment ID is required" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseRes = updateExternalCourierSchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseRes.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { externalCourierName, trackingNumber, externalTrackingUrl, externalMetadata } = parseRes.data;

    await updateExternalCourierDetails({
      shipmentId,
      orderId: "", // resolved inside service by shipment record lookup
      externalCourierName,
      trackingNumber,
      externalTrackingUrl: externalTrackingUrl || undefined,
      externalMetadata,
      adminName: auth.user.name || auth.user.phoneNumber,
      adminId: auth.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "External courier details successfully updated.",
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/shipments/[id]/external error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update external courier details" },
      { status: 400 }
    );
  }
}
