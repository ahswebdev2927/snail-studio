import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { adjustStock } from "@/services/inventory/inventory.service";
import { z } from "zod";

const adjustSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
  type: z.enum(["inbound", "outbound", "adjustment"]),
  quantity: z.number().int("Quantity must be an integer"),
  reference: z.string().max(255).optional().nullable(),
});

// POST /api/inventory/adjust - Perform physical stock adjustment and log transaction (Admin only)
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

    const result = adjustSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { inventoryItemId, type, quantity, reference } = result.data;

    // Validate type constraints (e.g. quantity must be positive for inbound/outbound)
    if (type !== "adjustment" && quantity < 0) {
      return NextResponse.json(
        { error: "Validation failed", details: { quantity: [`Quantity must be positive for ${type} transactions.`] } },
        { status: 400 }
      );
    }

    if (type === "outbound" && quantity === 0) {
      return NextResponse.json(
        { error: "Validation failed", details: { quantity: ["Quantity must be greater than zero for outbound transactions."] } },
        { status: 400 }
      );
    }

    const res = await adjustStock({
      inventoryItemId,
      type,
      quantity,
      reference: reference || null,
    });

    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/inventory/adjust error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
