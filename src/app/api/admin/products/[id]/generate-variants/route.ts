import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { generateMissingVariants } from "@/services/products/generate-missing-variants";
import { authorize } from "@/middleware/auth";
import { z } from "zod";

const schema = z.object({
  selectedAttributeValueIds: z.array(z.string()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authorize Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: productId } = await params;
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // 2. Parse and validate body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // 3. Generate missing variants in a transaction
    const res = await db.transaction(async (tx) => {
      return generateMissingVariants({
        productId,
        selectedAttributeValueIds: result.data.selectedAttributeValueIds,
        userId: auth.user!.id,
      }, tx);
    });

    return NextResponse.json(res, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/admin/products/[id]/generate-variants error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
