import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { fetchShipmentLabel } from "@/services/shipping/shipment-orchestration.service";

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

    const pdfSizeParam = req.nextUrl.searchParams.get("pdfSize") || "4R";
    const pdfSize = pdfSizeParam === "A4" ? "A4" : "4R";

    const labelResult = await fetchShipmentLabel(orderId, pdfSize);

    return NextResponse.json({
      success: true,
      pdfUrl: labelResult.pdfUrl,
      base64Pdf: labelResult.base64Pdf || null,
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/orders/[id]/label error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch shipment label" },
      { status: 400 }
    );
  }
}
