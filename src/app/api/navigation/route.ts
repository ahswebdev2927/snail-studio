import { NextResponse } from "next/server";
import { getStorefrontNavigation } from "@/services/navigation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const navigation = await getStorefrontNavigation();
    return NextResponse.json(navigation);
  } catch (error: unknown) {
    console.error("GET /api/navigation error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
