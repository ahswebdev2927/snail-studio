import { BetaAnalyticsDataClient } from "@google-analytics/data";

const clientEmail = process.env.GA_CLIENT_EMAIL;
const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n");
const propertyId = process.env.GA_PROPERTY_ID;

// Instantiate the GA4 Data API client if credentials are provided
const getGAClient = () => {
  if (!clientEmail || !privateKey || !propertyId) {
    console.log("ℹ️ Google Analytics GA4 environment credentials not fully configured. Using SAMPLE (mock) fallback data.");
    return null;
  }
  try {
    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
    console.log("✅ Google Analytics Data API client initialized successfully.");
    return client;
  } catch (error) {
    console.log("❌ Failed to initialize Google Analytics Data Client. Using SAMPLE (mock) fallback data.", error);
    return null;
  }
};

/**
 * Helper to generate mock data for local testing or when credentials are not configured.
 */
const getMockData = (type: "summary" | "sources" | "campaigns" | "funnel", days = 30, useMockFallback = true) => {
  const isProduction = process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
  
  if (isProduction || !useMockFallback) {
    switch (type) {
      case "summary":
        return {
          activeUsers: 0,
          sessions: 0,
          pageViews: 0,
          bounceRate: 0,
          avgSessionDuration: 0,
        };
      case "sources":
      case "campaigns":
        return [];
      case "funnel":
        return [
          { step: "Session Start (Visit)", count: 0, rate: 0 },
          { step: "Product View", count: 0, rate: 0 },
          { step: "Add To Wishlist", count: 0, rate: 0 },
          { step: "Add To Cart", count: 0, rate: 0 },
          { step: "Begin Checkout", count: 0, rate: 0 },
          { step: "Purchase", count: 0, rate: 0 },
        ];
      default:
        return {};
    }
  }

  const dateStr = `${days} Days`;
  switch (type) {
    case "summary":
      return {
        activeUsers: 1450 + Math.floor(Math.random() * 200),
        sessions: 2180 + Math.floor(Math.random() * 300),
        pageViews: 5840 + Math.floor(Math.random() * 600),
        bounceRate: 42.5 + Math.random() * 5,
        avgSessionDuration: 184 + Math.floor(Math.random() * 20), // in seconds
      };
    case "sources":
      return [
        { source: "google / organic", sessions: 980, activeUsers: 680, conversions: 24, revenue: 14400 },
        { source: "direct / (none)", sessions: 540, activeUsers: 410, conversions: 18, revenue: 11200 },
        { source: "instagram / social", sessions: 350, activeUsers: 290, conversions: 8, revenue: 4800 },
        { source: "newsletter / email", sessions: 210, activeUsers: 150, conversions: 12, revenue: 7600 },
        { source: "pinterest / social", sessions: 100, activeUsers: 80, conversions: 3, revenue: 1800 },
      ];
    case "campaigns":
      return [
        { campaign: "Summer Sale 2026", sessions: 450, conversions: 19, revenue: 11400 },
        { campaign: "Influencer Collab Alpha", sessions: 320, conversions: 12, revenue: 7200 },
        { campaign: "Launch Announcement", sessions: 180, conversions: 8, revenue: 4800 },
        { campaign: "Cart Abandoners Segment", sessions: 95, conversions: 6, revenue: 3900 },
      ];
    case "funnel":
      return [
        { step: "Session Start (Visit)", count: 2180, rate: 100 },
        { step: "Product View", count: 1480, rate: 67.9 },
        { step: "Add To Wishlist", count: 420, rate: 19.3 },
        { step: "Add To Cart", count: 320, rate: 14.7 },
        { step: "Begin Checkout", count: 180, rate: 8.3 },
        { step: "Purchase", count: 65, rate: 3.0 },
      ];
    default:
      return {};
  }
};

/**
 * Fetch Traffic & Overview Summary
 */
export async function getTrafficSummary(days = 30, forceMock = false) {
  if (forceMock) {
    return getMockData("summary", days, true);
  }
  const client = getGAClient();
  if (!client || !propertyId) {
    return getMockData("summary", days, forceMock);
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
    });

    const row = response.rows?.[0];
    if (!row || !row.metricValues) {
      console.log("⚠️ Google Analytics API returned empty summary rows. Serving SAMPLE data.");
      return getMockData("summary", days, forceMock);
    }

    console.log("📊 GA4 API Success: Loaded LIVE traffic overview summary.");
    return {
      activeUsers: parseInt(row.metricValues[0].value || "0", 10),
      sessions: parseInt(row.metricValues[1].value || "0", 10),
      pageViews: parseInt(row.metricValues[2].value || "0", 10),
      bounceRate: parseFloat(row.metricValues[3].value || "0") * 100, // API returns 0.425 for 42.5%
      avgSessionDuration: Math.round(parseFloat(row.metricValues[4].value || "0")), // in seconds
    };
  } catch (error) {
    console.log("⚠️ GA4 API query failed (Traffic Summary). Serving SAMPLE data fallback.", (error as Error).message);
    return getMockData("summary", days, forceMock);
  }
}

/**
 * Fetch Traffic Acquisition Sources
 */
export async function getTrafficSources(days = 30, forceMock = false) {
  if (forceMock) {
    return getMockData("sources", days, true);
  }
  const client = getGAClient();
  if (!client || !propertyId) {
    return getMockData("sources", days, forceMock);
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "sessionSourceMedium" }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "conversions" },
        { name: "totalRevenue" },
      ],
      limit: 10,
    });

    if (!response.rows || response.rows.length === 0) {
      console.log("⚠️ Google Analytics API returned empty source rows. Serving SAMPLE data.");
      return getMockData("sources", days, forceMock);
    }

    console.log("📊 GA4 API Success: Loaded LIVE acquisition channels.");
    return response.rows.map((row) => {
      const dimensionValue = row.dimensionValues?.[0]?.value || "unknown";
      const metricValues = row.metricValues || [];
      return {
        source: dimensionValue,
        sessions: parseInt(metricValues[0]?.value || "0", 10),
        activeUsers: parseInt(metricValues[1]?.value || "0", 10),
        conversions: parseInt(metricValues[2]?.value || "0", 10),
        revenue: parseFloat(metricValues[3]?.value || "0"),
      };
    });
  } catch (error) {
    console.log("⚠️ GA4 API query failed (Traffic Sources). Serving SAMPLE data fallback.", (error as Error).message);
    return getMockData("sources", days, forceMock);
  }
}

/**
 * Fetch Campaign Attribution (UTM Campaign tracking)
 */
export async function getCampaignAttribution(days = 30, forceMock = false) {
  if (forceMock) {
    return getMockData("campaigns", days, true);
  }
  const client = getGAClient();
  if (!client || !propertyId) {
    return getMockData("campaigns", days, forceMock);
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "sessionCampaignName" }],
      metrics: [
        { name: "sessions" },
        { name: "conversions" },
        { name: "totalRevenue" },
      ],
      limit: 10,
    });

    if (!response.rows || response.rows.length === 0) {
      console.log("⚠️ Google Analytics API returned empty campaign rows. Serving SAMPLE data.");
      return getMockData("campaigns", days, forceMock);
    }

    // Filter out internal/empty campaigns e.g. "(organic)", "(referral)", "(direct)"
    const filteredCampaigns = response.rows
      .map((row) => {
        const campaign = row.dimensionValues?.[0]?.value || "";
        const metrics = row.metricValues || [];
        return {
          campaign,
          sessions: parseInt(metrics[0]?.value || "0", 10),
          conversions: parseInt(metrics[1]?.value || "0", 10),
          revenue: parseFloat(metrics[2]?.value || "0"),
        };
      })
      .filter((c) => c.campaign && !["(organic)", "(referral)", "(direct)", "(not set)", "(none)"].includes(c.campaign));

    if (filteredCampaigns.length === 0) {
      console.log("ℹ️ No campaign attributes found in active GA4 reports. Serving SAMPLE data.");
      return getMockData("campaigns", days, forceMock);
    }

    console.log("📊 GA4 API Success: Loaded LIVE campaign performance reports.");
    return filteredCampaigns;
  } catch (error) {
    console.log("⚠️ GA4 API query failed (Campaign Performance). Serving SAMPLE data fallback.", (error as Error).message);
    return getMockData("campaigns", days, forceMock);
  }
}

/**
 * Fetch Conversion Funnel Metrics
 */
export async function getFunnelMetrics(days = 30, forceMock = false) {
  if (forceMock) {
    return getMockData("funnel", days, true);
  }
  const client = getGAClient();
  if (!client || !propertyId) {
    return getMockData("funnel", days, forceMock);
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "activeUsers" }], // Measure distinct users at each funnel stage
    });

    if (!response.rows || response.rows.length === 0) {
      console.log("⚠️ Google Analytics API returned empty funnel rows. Serving SAMPLE data.");
      return getMockData("funnel", days);
    }

    // Capture standard events
    const eventCounts: Record<string, number> = {
      session_start: 0,
      view_item: 0,
      add_to_wishlist: 0,
      add_to_cart: 0,
      begin_checkout: 0,
      purchase: 0,
    };

    response.rows.forEach((row) => {
      const eventName = row.dimensionValues?.[0]?.value || "";
      if (eventName in eventCounts) {
        eventCounts[eventName] = parseInt(row.metricValues?.[0]?.value || "0", 10);
      }
    });

    const steps = [
      { step: "Session Start (Visit)", count: eventCounts["session_start"] || eventCounts["first_visit"] || 0 },
      { step: "Product View", count: eventCounts["view_item"] || 0 },
      { step: "Add To Wishlist", count: eventCounts["add_to_wishlist"] || 0 },
      { step: "Add To Cart", count: eventCounts["add_to_cart"] || 0 },
      { step: "Begin Checkout", count: eventCounts["begin_checkout"] || 0 },
      { step: "Purchase", count: eventCounts["purchase"] || 0 },
    ];

    // Ensure session_start or visit exists (fall back to max count if 0)
    const maxCount = Math.max(...steps.map((s) => s.count));
    if (steps[0].count === 0 && maxCount > 0) {
      steps[0].count = maxCount * 1.5; // Appoximate sessions start if GA4 event is omitted from property
    }

    const baseline = steps[0].count || 1;
    const formattedSteps = steps.map((s) => ({
      step: s.step,
      count: s.count,
      rate: parseFloat(((s.count / baseline) * 100).toFixed(1)),
    }));

    console.log("📊 GA4 API Success: Loaded LIVE conversion funnel metrics.");
    return formattedSteps;
  } catch (error) {
    console.log("⚠️ GA4 API query failed (Conversion Funnel). Serving SAMPLE data fallback.", (error as Error).message);
    return getMockData("funnel", days, forceMock);
  }
}

/**
 * Fetch Realtime Active Users (last 30 minutes)
 */
export async function getRealtimeActiveUsers(forceMock = false) {
  const isProduction = process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
  if (forceMock && !isProduction) {
    return 15 + Math.floor(Math.random() * 8);
  }
  const client = getGAClient();
  if (!client || !propertyId) {
    return isProduction ? 0 : 15 + Math.floor(Math.random() * 8); // Mock live users fallback
  }

  try {
    const [response] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: "activeUsers" }],
    });

    const activeUsersValue = response.rows?.[0]?.metricValues?.[0]?.value;
    const activeCount = activeUsersValue ? parseInt(activeUsersValue, 10) : 0;
    console.log(`⏱️ GA4 API Success: Loaded LIVE active users: ${activeCount}`);
    return activeCount;
  } catch (error) {
    console.log("⚠️ GA4 API query failed (Realtime Active Users). Serving SAMPLE active users count.", (error as Error).message);
    return isProduction ? 0 : 15 + Math.floor(Math.random() * 8); // default fallback
  }
}
