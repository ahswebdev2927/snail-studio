import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { getInventoryTransactions } from "@/services/inventory/inventory.service";

// GET /api/inventory/logs - Fetch recent inventory transactions history (Admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : undefined;

    const logs = await getInventoryTransactions({ limit });

    return NextResponse.json(logs, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/inventory/logs error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
