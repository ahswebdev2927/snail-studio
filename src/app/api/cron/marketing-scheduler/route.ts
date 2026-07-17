import { NextResponse } from "next/server";
import { processScheduledCampaigns } from "@/services/email/scheduler.service";

async function handleRequest(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[Cron Scheduler] CRON_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: "Scheduler configuration error" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Cron Scheduler] Unauthorized access attempt blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron Scheduler] Triggering processScheduledCampaigns()...");
    const result = await processScheduledCampaigns();
    console.log(`[Cron Scheduler] Execution finished. Processed: ${result.processedCount}, Errors: ${result.errors.length}`);

    return NextResponse.json({
      success: true,
      processedCount: result.processedCount,
      errors: result.errors
    });
  } catch (error: any) {
    console.error("[Cron Scheduler] Unhandled error during cron invocation:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
