import { NextResponse } from "next/server";
import { runWeeklySecurityCleanup } from "@/services/db-cleanup/cleanup.service";

async function handleRequest(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[Security Cleanup Cron] CRON_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: "Cron configuration error" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Security Cleanup Cron] Unauthorized access attempt blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Security Cleanup Cron] Triggering runWeeklySecurityCleanup()...");
    const result = await runWeeklySecurityCleanup();
    console.log("[Security Cleanup Cron] Weekly security cleanup execution finished successfully.");

    return NextResponse.json({
      success: true,
      deleted: result
    });
  } catch (error: unknown) {
    console.error("[Security Cleanup Cron] Unhandled error during cron invocation:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
