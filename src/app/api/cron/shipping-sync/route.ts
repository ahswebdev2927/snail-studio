import { NextRequest, NextResponse } from "next/server";
import { syncActiveShipments } from "@/services/shipping/tracking-sync.service";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "snail_studio_cron_secret";

    // Validate authorization via Bearer header or secret query parameter
    if (authHeader !== `Bearer ${cronSecret}`) {
      const urlSecret = req.nextUrl.searchParams.get("secret");
      if (urlSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized cron execution token" }, { status: 401 });
      }
    }

    console.log("[Cron:ShippingSync] Execution initiated.");
    const result = await syncActiveShipments();

    // Ensure error payload remains capped for cron-job.org 64KB response limit
    const cappedErrors = result.errors.slice(0, 20);

    const responseData = {
      totalSynced: result.totalSynced,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount || 0,
      failedCount: result.failedCount || 0,
      durationMs: result.durationMs || Date.now() - startTime,
      errors: cappedErrors,
    };

    console.log(
      `[Cron:ShippingSync] Completed in ${responseData.durationMs}ms. Synced: ${responseData.totalSynced}, Updated: ${responseData.updatedCount}, Skipped: ${responseData.skippedCount}, Failed: ${responseData.failedCount}.`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Tracking synchronization completed successfully.",
        data: responseData,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Cron:ShippingSync] Unhandled route error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
