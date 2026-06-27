import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productBundles } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/bundles/active - Fetch active bundles for storefront use
export async function GET(req: NextRequest) {
  try {
    const activeBundles = await db.query.productBundles.findMany({
      where: eq(productBundles.isActive, true),
      with: {
        items: {
          with: {
            product: {
              with: {
                variants: {
                  where: (v, { eq }) => eq(v.status, "Active")
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(activeBundles, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/bundles/active error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
