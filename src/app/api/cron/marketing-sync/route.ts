import { NextResponse } from "next/server";
import { syncResendDeliveries } from "@/services/email/scheduler.service";

async function handleRequest(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[Cron Sync] CRON_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: "Sync configuration error" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Cron Sync] Unauthorized access attempt blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron Sync] Triggering syncResendDeliveries()...");
    const result = await syncResendDeliveries();
    console.log(`[Cron Sync] Execution finished. Synced: ${result.syncedCount}, Cleaned: ${result.cleanedCount}, Errors: ${result.errors.length}`);

    return NextResponse.json({
      success: true,
      syncedCount: result.syncedCount,
      cleanedCount: result.cleanedCount,
      errors: result.errors
    });
  } catch (error: any) {
    console.error("[Cron Sync] Unhandled error during cron invocation:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
