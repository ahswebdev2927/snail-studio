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

    // 1. Bulk count subscribers per product
    const subsCounts = await db
      .select({ productId: launchSubscribers.productId, val: count() })
      .from(launchSubscribers)
      .groupBy(launchSubscribers.productId);
    const subsCountMap = new Map(subsCounts.map((s) => [s.productId, s.val]));

    // 2. Bulk count event metrics (views, email notifications) per product
    const eventCounts = await db
      .select({
        productId: launchEvents.productId,
        eventType: launchEvents.eventType,
        val: count(),
      })
      .from(launchEvents)
      .groupBy(launchEvents.productId, launchEvents.eventType);

    const eventCountsMap = new Map<string, { viewCount: number; emailCount: number }>();
    for (const ec of eventCounts) {
      if (!ec.productId) continue;
      if (!eventCountsMap.has(ec.productId)) {
        eventCountsMap.set(ec.productId, { viewCount: 0, emailCount: 0 });
      }
      const val = eventCountsMap.get(ec.productId)!;
      if (ec.eventType === "view") {
        val.viewCount += ec.val;
      } else if (ec.eventType && ec.eventType.startsWith("email_")) {
        val.emailCount += ec.val;
      }
    }

    // 3. Bulk fetch subscribers emails per product
    const allActiveProductIds = activeProducts.map((p) => p.id);
    const productSubscribers = allActiveProductIds.length > 0
      ? await db
          .select({ productId: launchSubscribers.productId, email: launchSubscribers.email })
          .from(launchSubscribers)
          .where(inArray(launchSubscribers.productId, allActiveProductIds))
      : [];

    const subEmailsMap = new Map<string, string[]>();
    for (const ps of productSubscribers) {
      if (!ps.productId) continue;
      if (!subEmailsMap.has(ps.productId)) {
        subEmailsMap.set(ps.productId, []);
      }
      subEmailsMap.get(ps.productId)!.push(ps.email);
    }

    // 4. Bulk fetch conversions: subscribers who ordered this product's variants
    const activeVariantIds = activeProducts.flatMap((p) => p.variants.map((v) => v.id));
    const allSubEmails = Array.from(new Set(productSubscribers.map((s) => s.email).filter(Boolean)));
    const subscriberSalesSet = new Set<string>();

    if (activeVariantIds.length > 0 && allSubEmails.length > 0) {
      const salesResult = await db
        .select({ email: users.email, variantId: orderItems.variantId })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .innerJoin(users, eq(orders.userId, users.id))
        .where(
          and(
            inArray(orderItems.variantId, activeVariantIds),
            inArray(users.email, allSubEmails),
            sql`${orders.status} IN ('paid', 'confirmed', 'processing', 'shipped', 'delivered')`
          )
        );

      for (const sale of salesResult) {
        if (sale.email) {
          subscriberSalesSet.add(`${sale.email}_${sale.variantId}`);
        }
      }
    }

    // 5. Aggregate stats in memory
    for (const prod of activeProducts) {
      const subscriberCount = subsCountMap.get(prod.id) || 0;
      const ec = eventCountsMap.get(prod.id) || { viewCount: 0, emailCount: 0 };
      const viewCount = ec.viewCount;
      const emailCount = ec.emailCount;

      let conversionCount = 0;
      if (subscriberCount > 0 && prod.variants.length > 0) {
        const subEmails = subEmailsMap.get(prod.id) || [];
        const variantIds = prod.variants.map((v) => v.id);

        for (const email of subEmails) {
          const hasPurchased = variantIds.some((vid) =>
            subscriberSalesSet.has(`${email}_${vid}`)
          );
          if (hasPurchased) {
            conversionCount++;
          }
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
