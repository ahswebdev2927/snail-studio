import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { getInventoryItems, updateLowStockThreshold } from "@/services/inventory/inventory.service";
import { z } from "zod";

const patchSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
  lowStockThreshold: z.number().int().min(0, "Threshold must be a non-negative integer"),
});

// GET /api/inventory - Fetch filtered/searched list of inventory variant stock items (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;

    const items = await getInventoryItems({ q, status });

    return NextResponse.json(items, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/inventory - Update low stock alert threshold for an inventory item (Admin only)
export async function PATCH(req: NextRequest) {
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

    const result = patchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { inventoryItemId, lowStockThreshold } = result.data;

    const res = await updateLowStockThreshold(inventoryItemId, lowStockThreshold);

    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error("PATCH /api/inventory error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
