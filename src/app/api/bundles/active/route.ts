import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productBundles } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/bundles/active - Fetch active bundles for storefront use
export async function GET(req: NextRequest) {
  try {
    const allActive = await db.query.productBundles.findMany({
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

    // Filter scheduled bundles
    const now = new Date();
    const activeBundles = allActive.filter((bundle) => {
      const startValid = !bundle.startDate || new Date(bundle.startDate) <= now;
      const endValid = !bundle.endDate || new Date(bundle.endDate) >= now;
      return startValid && endValid;
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
