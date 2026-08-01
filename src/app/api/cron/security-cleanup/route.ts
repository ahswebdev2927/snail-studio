import { NextResponse, NextRequest } from "next/server";
import { runWeeklySecurityCleanup } from "@/services/db-cleanup/cleanup.service";
import { logRouteHandler } from "@/lib/logger/request";

async function handleRequest(request: Request) {
  const reqLogger = (request as any).log;
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      reqLogger.error({ type: "cron_error" }, "[Security Cleanup Cron] CRON_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: "Cron configuration error" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      reqLogger.warn({ type: "cron_auth_failed" }, "[Security Cleanup Cron] Unauthorized access attempt blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    reqLogger.info({ type: "cron_start" }, "[Security Cleanup Cron] Triggering runWeeklySecurityCleanup()...");
    const result = await runWeeklySecurityCleanup();
    reqLogger.info({ type: "cron_success", deleted: result }, "[Security Cleanup Cron] Weekly security cleanup execution finished successfully.");

    return NextResponse.json({
      success: true,
      deleted: result
    });
  } catch (error: unknown) {
    reqLogger.error({ err: error, type: "cron_failed" }, "[Security Cleanup Cron] Unhandled error during cron invocation");
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const loggedHandleRequest = logRouteHandler(handleRequest as any);

export async function GET(request: Request) {
  return loggedHandleRequest(request as NextRequest);
}

export async function POST(request: Request) {
  return loggedHandleRequest(request as NextRequest);
}
