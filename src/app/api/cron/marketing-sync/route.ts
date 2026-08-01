import { NextResponse, NextRequest } from "next/server";
import { syncResendDeliveries } from "@/services/email/scheduler.service";
import { logRouteHandler } from "@/lib/logger/request";

async function handleRequest(request: Request) {
  const reqLogger = (request as any).log;
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      reqLogger.error({ type: "cron_error" }, "[Cron Sync] CRON_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: "Sync configuration error" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      reqLogger.warn({ type: "cron_auth_failed" }, "[Cron Sync] Unauthorized access attempt blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    reqLogger.info({ type: "cron_start" }, "[Cron Sync] Triggering syncResendDeliveries()...");
    const result = await syncResendDeliveries();
    reqLogger.info(
      { type: "cron_success", syncedCount: result.syncedCount, cleanedCount: result.cleanedCount, errorsCount: result.errors.length },
      `[Cron Sync] Execution finished. Synced: ${result.syncedCount}, Cleaned: ${result.cleanedCount}, Errors: ${result.errors.length}`
    );

    return NextResponse.json({
      success: true,
      syncedCount: result.syncedCount,
      cleanedCount: result.cleanedCount,
      errors: result.errors
    });
  } catch (error: any) {
    reqLogger.error({ err: error, type: "cron_failed" }, "[Cron Sync] Unhandled error during cron invocation");
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

const loggedHandleRequest = logRouteHandler(handleRequest as any);

export async function GET(request: Request) {
  return loggedHandleRequest(request as NextRequest);
}

export async function POST(request: Request) {
  return loggedHandleRequest(request as NextRequest);
}
