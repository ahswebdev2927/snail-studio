import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { validatePreShipment } from "@/services/shipping/shipping-policy.service";

export async function GET(
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

    const validation = await validatePreShipment(orderId);

    return NextResponse.json(validation, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/orders/[id]/validate-preshipment error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
