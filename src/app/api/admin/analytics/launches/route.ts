import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, launchSubscribers, launchEvents, orderItems, orders, users } from "@/db/schema";
import { eq, and, sql, count, desc, inArray } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    // 1. Fetch preview/launch products or products that have subscribers
    const activeProducts = await db.query.products.findMany({
      where: sql`${products.status} IN ('Coming Soon', 'Launching Soon', 'Active')`,
      with: {
        variants: true,
      }
    });

    const reportProducts = [];

    // 2. Aggregate stats for each product
    for (const prod of activeProducts) {
      // Get subscribers count
      const subsResult = await db
        .select({ val: count() })
        .from(launchSubscribers)
        .where(eq(launchSubscribers.productId, prod.id));
      const subscriberCount = subsResult[0]?.val || 0;

      // Get views count
      const viewsResult = await db
        .select({ val: count() })
        .from(launchEvents)
        .where(
          and(
            eq(launchEvents.productId, prod.id),
            eq(launchEvents.eventType, "view")
          )
        );
      const viewCount = viewsResult[0]?.val || 0;

      // Get sent notifications counts
      const alertsResult = await db
        .select({ val: count() })
        .from(launchEvents)
        .where(
          and(
            eq(launchEvents.productId, prod.id),
            sql`${launchEvents.eventType} LIKE 'email_%'`
          )
        );
      const emailCount = alertsResult[0]?.val || 0;

      // Calculate conversions: subscribers who ordered this product's variants
      let conversionCount = 0;
      if (subscriberCount > 0 && prod.variants.length > 0) {
        const variantIds = prod.variants.map((v) => v.id);
        const productSubscribers = await db
          .select({ email: launchSubscribers.email })
          .from(launchSubscribers)
          .where(eq(launchSubscribers.productId, prod.id));
        const subEmails = productSubscribers.map((s) => s.email);

        if (subEmails.length > 0) {
          const salesResult = await db
            .select({ val: count(orders.id) })
            .from(orders)
            .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
            .innerJoin(users, eq(orders.userId, users.id))
            .where(
              and(
                inArray(orderItems.variantId, variantIds),
                inArray(users.email, subEmails),
                sql`${orders.status} IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')`
              )
            );
          conversionCount = salesResult[0]?.val || 0;
        }
      }

      // Only include products that are currently previewing OR have launch activity
      if (
        prod.status === "Coming Soon" ||
        prod.status === "Launching Soon" ||
        subscriberCount > 0 ||
        viewCount > 0
      ) {
        reportProducts.push({
          id: prod.id,
          name: prod.name,
          slug: prod.slug,
          status: prod.status,
          launchDate: prod.launchDate,
          launchTime: prod.launchTime,
          autoPublish: prod.autoPublish,
          subscribers: subscriberCount,
          views: viewCount,
          notificationsSent: emailCount,
          conversions: conversionCount,
          conversionRate: subscriberCount > 0 ? ((conversionCount / subscriberCount) * 100).toFixed(1) : "0.0",
        });
      }
    }

    // 3. Fetch global aggregates
    const totalSubscribersResult = await db
      .select({ val: count() })
      .from(launchSubscribers);
    const totalSubscribers = totalSubscribersResult[0]?.val || 0;

    const totalViewsResult = await db
      .select({ val: count() })
      .from(launchEvents)
      .where(eq(launchEvents.eventType, "view"));
    const totalViews = totalViewsResult[0]?.val || 0;

    const totalAlertsResult = await db
      .select({ val: count() })
      .from(launchEvents)
      .where(sql`${launchEvents.eventType} LIKE 'email_%'`);
    const totalAlerts = totalAlertsResult[0]?.val || 0;

    // 4. Fetch recent activity feed (last 15 events)
    const recentEvents = await db.query.launchEvents.findMany({
      orderBy: desc(launchEvents.createdAt),
      limit: 15,
      with: {
        product: {
          columns: {
            name: true,
          }
        }
      }
    });

    return NextResponse.json({
      summary: {
        totalSubscribers,
        totalViews,
        totalAlerts,
        productsCount: reportProducts.length,
      },
      products: reportProducts,
      activities: recentEvents.map((e) => ({
        id: e.id,
        productId: e.productId,
        productName: e.product?.name || "Unknown Product",
        eventType: e.eventType,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        createdAt: e.createdAt,
      })),
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/analytics/launches error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
