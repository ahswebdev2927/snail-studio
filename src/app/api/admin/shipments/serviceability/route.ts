import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { getShippingProvider } from "@/lib/shipping";
import { z } from "zod";

const serviceabilitySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  weightGrams: z.number().optional().default(500),
});

// POST /api/admin/shipments/serviceability - Check pincode serviceability
export async function POST(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseRes = serviceabilitySchema.safeParse(body);
    if (!parseRes.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseRes.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { pincode, weightGrams } = parseRes.data;
    const provider = getShippingProvider("delhivery");

    const result = await provider.checkServiceability({
      pincode,
      paymentType: "Prepaid",
      weightGrams,
    });

    return NextResponse.json({
      success: true,
      serviceability: result,
    });
  } catch (error: any) {
    console.error("POST /api/admin/shipments/serviceability error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check pincode serviceability" },
      { status: 400 }
    );
  }
}
