import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/middleware/auth";
import { 
  getTrafficSummary, 
  getTrafficSources, 
  getCampaignAttribution, 
  getFunnelMetrics,
  getRealtimeActiveUsers
} from "@/services/google-analytics";

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize as Admin
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 2. Parse range and mock parameters
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";
    const useMockParam = searchParams.get("useMock") === "true";
    
    const isProduction = process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
    const forceMock = useMockParam && !isProduction;

    let days = 30;
    if (range === "7d") {
      days = 7;
    } else if (range === "30d") {
      days = 30;
    } else if (range === "90d") {
      days = 90;
    }

    // 3. Query the GA4 API reports in parallel
    const [summary, sources, campaigns, funnel, realtimeUsers] = await Promise.all([
      getTrafficSummary(days, forceMock),
      getTrafficSources(days, forceMock),
      getCampaignAttribution(days, forceMock),
      getFunnelMetrics(days, forceMock),
      getRealtimeActiveUsers(forceMock),
    ]);

    // 4. Return report payload
    return NextResponse.json({
      summary,
      sources,
      campaigns,
      funnel,
      realtimeUsers,
    });
  } catch (error) {
    console.error("Error in Google Analytics admin route:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
