import { NextRequest, NextResponse } from "next/server";
import { syncActiveShipments } from "@/services/shipping/tracking-sync.service";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "snail_studio_cron_secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
      const urlSecret = req.nextUrl.searchParams.get("secret");
      if (urlSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized cron execution token" }, { status: 401 });
      }
    }

    const result = await syncActiveShipments();

    return NextResponse.json({
      success: true,
      message: "Tracking synchronization completed successfully.",
      data: result,
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST /api/cron/shipping-sync error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
