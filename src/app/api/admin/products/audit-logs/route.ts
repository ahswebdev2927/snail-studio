import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userAuditLogs, productVariants } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    let whereClause;
    if (productId) {
      // Find variants of the product to include their audits too
      const variants = await db.query.productVariants.findMany({
        where: eq(productVariants.productId, productId)
      });
      const ids = [productId, ...variants.map(v => v.id)];
      whereClause = inArray(userAuditLogs.entityId, ids);
    } else {
      whereClause = inArray(userAuditLogs.entityType, ["product", "variant"]);
    }

    const logs = await db.query.userAuditLogs.findMany({
      where: whereClause,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: [desc(userAuditLogs.createdAt)],
      limit: 100, // Show latest 100 logs
    });

    return NextResponse.json(logs, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/products/audit-logs error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
