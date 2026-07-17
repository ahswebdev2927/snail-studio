import { NextRequest, NextResponse } from "next/server";
import { resolveCampaignAudience } from "@/services/email/scheduler.service";
import { authorize } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { searchParams } = new URL(req.url);
    const segment = searchParams.get("segment") || "all";

    // Resolve matching recipients from SQLite
    const recipients = await resolveCampaignAudience(segment, null);

    return NextResponse.json({
      success: true,
      count: recipients.length,
      recipients: recipients.map((r: { userId: string | null; email: string; name: string }) => ({
        id: r.userId || null,
        email: r.email,
        name: r.name || "Customer",
      })),
    });
  } catch (error: any) {
    console.error("[Segment API] Failed to load segment preview:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
