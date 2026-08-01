import { NextResponse, NextRequest } from "next/server";
import { processScheduledCampaigns } from "@/services/email/scheduler.service";
import { logRouteHandler } from "@/lib/logger/request";

async function handleRequest(request: Request) {
  const reqLogger = (request as any).log;
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      reqLogger.error({ type: "cron_error" }, "[Cron Scheduler] CRON_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: "Scheduler configuration error" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      reqLogger.warn({ type: "cron_auth_failed" }, "[Cron Scheduler] Unauthorized access attempt blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    reqLogger.info({ type: "cron_start" }, "[Cron Scheduler] Triggering processScheduledCampaigns()...");
    const result = await processScheduledCampaigns();
    reqLogger.info(
      { type: "cron_success", processedCount: result.processedCount, errorsCount: result.errors.length },
      `[Cron Scheduler] Execution finished. Processed: ${result.processedCount}, Errors: ${result.errors.length}`
    );

    return NextResponse.json({
      success: true,
      processedCount: result.processedCount,
      errors: result.errors
    });
  } catch (error: any) {
    reqLogger.error({ err: error, type: "cron_failed" }, "[Cron Scheduler] Unhandled error during cron invocation");
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
