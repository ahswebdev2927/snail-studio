import { NextResponse } from "next/server";
import { db } from "@/db";

export async function GET() {
  try {
    const allAttributes = await db.query.attributeGroups.findMany({
      with: {
        values: true,
      },
    });

    return NextResponse.json(allAttributes);
  } catch (error: unknown) {
    console.error("GET /api/attributes error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal Server Error", details: message },
      { status: 500 }
    );
  }
}
