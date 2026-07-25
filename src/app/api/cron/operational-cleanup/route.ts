import { NextResponse } from "next/server";
import { runMonthlyOperationalCleanup } from "@/services/db-cleanup/cleanup.service";

async function handleRequest(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[Operational Cleanup Cron] CRON_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: "Cron configuration error" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Operational Cleanup Cron] Unauthorized access attempt blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Operational Cleanup Cron] Triggering runMonthlyOperationalCleanup()...");
    const result = await runMonthlyOperationalCleanup();
    console.log("[Operational Cleanup Cron] Monthly operational cleanup execution finished successfully.");

    return NextResponse.json({
      success: true,
      deleted: result
    });
  } catch (error: unknown) {
    console.error("[Operational Cleanup Cron] Unhandled error during cron invocation:", error);
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
