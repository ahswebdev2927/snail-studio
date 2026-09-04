import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { scheduleShipmentPickup } from "@/services/shipping/shipment-orchestration.service";
import { z } from "zod";

const schedulePickupSchema = z.object({
  pickupDate: z.string().min(10, "Pickup date must be formatted as YYYY-MM-DD"),
  pickupTime: z.string().optional().default("14:00:00"),
  packageCount: z.number().min(1).default(1),
});

// POST /api/admin/shipments/pickup - Schedule courier pickup with provider
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseRes = schedulePickupSchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseRes.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { pickupDate, pickupTime, packageCount } = parseRes.data;

    const pickupResult = await scheduleShipmentPickup({
      pickupDate,
      pickupTime,
      packageCount,
      adminName: auth.user.name || auth.user.phoneNumber,
      adminId: auth.user.id,
    });

    return NextResponse.json({
      success: true,
      message: pickupResult.message || `Pickup scheduled successfully for ${packageCount} package(s).`,
      pickupId: pickupResult.pickupId,
      rawResponse: (pickupResult as any).rawResponse || null,
    });
  } catch (error: any) {
    console.error("POST /api/admin/shipments/pickup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule pickup" },
      { status: 400 }
    );
  }
}
