import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, userAuditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authorize } from "@/middleware/auth";

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

    // 2. Fetch product status
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.status === "Archived") {
      return NextResponse.json({ success: true, message: "Product is already archived" }, { status: 200 });
    }

    const now = new Date();

    // 3. Update status in a transaction & write audit log
    await db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({
          status: "Archived",
          isActive: false,
          updatedAt: now,
        })
        .where(eq(products.id, productId));

      const auditChanges = {
        status: { old: product.status, new: "Archived" }
      };

      await tx.insert(userAuditLogs).values({
        id: `al_${nanoid(12)}`,
        userId: auth.user!.id,
        action: "archive_product",
        entityType: "product",
        entityId: productId,
        changes: JSON.stringify(auditChanges),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        createdAt: now,
      });
    });

    return NextResponse.json({
      success: true,
      message: "Product archived successfully",
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/admin/products/[id]/archive error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
