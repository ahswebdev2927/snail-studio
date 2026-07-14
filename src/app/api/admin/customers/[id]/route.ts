import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  users, 
  orders, 
  orderItems, 
  productVariants, 
  variantAttributeValues, 
  attributeValues, 
  attributeGroups, 
  productCollections, 
  collections, 
  categories, 
  wishlists, 
  wishlistItems, 
  recentlyViewed, 
  products, 
  couponUsage, 
  coupons, 
  customerTags,
  searchLogs
} from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { getCustomerSegments } from "@/services/crm/segmentation.service";
import { getCustomerTimeline } from "@/services/crm/timeline.service";

// GET /api/admin/customers/[id] - Retrieve customer 360 profile details (Admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id } = await params;

    // 1. Fetch customer user details
    const customer = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!customer || customer.role !== "customer") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // 2. Fetch completed order metrics (LTV, count, AOV)
    const completedStats = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
        spent: sql<number>`sum(${orders.totalAmount})`.mapWith(Number),
      })
      .from(orders)
      .where(
        and(
          eq(orders.userId, id),
          inArray(orders.status, ["paid", "confirmed", "processing", "shipped", "delivered"])
        )
      );

    const completedOrdersCount = completedStats[0]?.count || 0;
    const totalSpent = completedStats[0]?.spent || 0;
    const avgSpentValue = completedOrdersCount > 0 ? totalSpent / completedOrdersCount : 0;

    // 3. Fetch admin-defined tags
    const tagsData = await db
      .select({ tag: customerTags.tag })
      .from(customerTags)
      .where(eq(customerTags.userId, id));
    const tags = tagsData.map(t => t.tag);

    // 4. Fetch dynamic customer segment memberships
    const segments = await getCustomerSegments(id);

    // 5. Fetch full orders list
    const ordersList = await db.query.orders.findMany({
      where: eq(orders.userId, id),
      orderBy: [desc(orders.createdAt)],
    });

    // 6. Fetch wishlist products details
    const wishlist = await db.query.wishlists.findFirst({
      where: eq(wishlists.userId, id),
    });
    let wishlistProducts: any[] = [];
    if (wishlist) {
      const wItems = await db.query.wishlistItems.findMany({
        where: eq(wishlistItems.wishlistId, wishlist.id),
      });
      const wProductIds = wItems.map(item => item.productId);
      if (wProductIds.length > 0) {
        wishlistProducts = await db.query.products.findMany({
          where: inArray(products.id, wProductIds),
          with: {
            media: {
              with: { media: true },
              orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
            },
          },
        });
      }
    }

    // 7. Fetch recently viewed products details
    const recentlyViewedEntries = await db.query.recentlyViewed.findMany({
      where: eq(recentlyViewed.userId, id),
      orderBy: [desc(recentlyViewed.createdAt)],
      limit: 12,
    });
    let recentlyViewedProducts: any[] = [];
    const rvProductIds = recentlyViewedEntries.map(e => e.productId);
    if (rvProductIds.length > 0) {
      const productsData = await db.query.products.findMany({
        where: inArray(products.id, rvProductIds),
        with: {
          media: {
            with: { media: true },
            orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
          },
        },
      });
      // Preserve chronological search history order
      recentlyViewedProducts = rvProductIds
        .map(pid => productsData.find(p => p.id === pid))
        .filter((p): p is NonNullable<typeof p> => !!p);
    }

    // 8. Fetch search history queries
    const searches = await db.query.searchLogs.findMany({
      where: eq(searchLogs.userId, id),
      orderBy: [desc(searchLogs.createdAt)],
      limit: 15,
    });

    // 9. Fetch coupons usage history
    const couponsUsed = await db
      .select({
        id: couponUsage.id,
        code: coupons.code,
        discountType: coupons.discountType,
        discountValue: coupons.discountValue,
        usedAt: couponUsage.createdAt,
        orderId: couponUsage.orderId,
      })
      .from(couponUsage)
      .innerJoin(coupons, eq(couponUsage.couponId, coupons.id))
      .where(eq(couponUsage.userId, id))
      .orderBy(desc(couponUsage.createdAt));

    // 10. Fetch unified activity timeline
    const timeline = await getCustomerTimeline(id, customer.email);

    // 11. Dynamically derive favorite attributes based on order history
    const getFavAttribute = async (groupCode: string): Promise<string> => {
      const res = await db
        .select({
          value: attributeValues.value,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
        .innerJoin(variantAttributeValues, eq(productVariants.id, variantAttributeValues.variantId))
        .innerJoin(attributeValues, eq(variantAttributeValues.attributeValueId, attributeValues.id))
        .innerJoin(attributeGroups, eq(attributeValues.groupId, attributeGroups.id))
        .where(
          and(
            eq(orders.userId, id),
            inArray(orders.status, ["paid", "confirmed", "processing", "shipped", "delivered"]),
            eq(attributeGroups.code, groupCode)
          )
        )
        .groupBy(attributeValues.id)
        .orderBy(desc(sql`count(*)`))
        .limit(1);
      return res[0]?.value || "None yet";
    };

    const favoriteShape = await getFavAttribute("shape");
    const favoriteLength = await getFavAttribute("length");

    // 12. Derive favorite category based on order history
    const favCategory = await db
      .select({
        name: categories.name,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(orders.userId, id),
          inArray(orders.status, ["paid", "confirmed", "processing", "shipped", "delivered"])
        )
      )
      .groupBy(categories.id)
      .orderBy(desc(sql`count(*)`))
      .limit(1);
    const favoriteCategory = favCategory[0]?.name || "None yet";

    // 13. Derive favorite collection based on order history
    const favCollection = await db
      .select({
        name: collections.name,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .innerJoin(productCollections, eq(products.id, productCollections.productId))
      .innerJoin(collections, eq(productCollections.collectionId, collections.id))
      .where(
        and(
          eq(orders.userId, id),
          inArray(orders.status, ["paid", "confirmed", "processing", "shipped", "delivered"])
        )
      )
      .groupBy(collections.id)
      .orderBy(desc(sql`count(*)`))
      .limit(1);
    const favoriteCollection = favCollection[0]?.name || "None yet";

    // Compile into Customer 360 payload
    const payload = {
      customer: {
        id: customer.id,
        name: customer.name,
        phoneNumber: customer.phoneNumber,
        whatsappNumber: customer.whatsappNumber,
        email: customer.email,
        image: customer.image,
        isActive: customer.isActive,
        lastLoginAt: customer.lastLoginAt,
        createdAt: customer.createdAt,
      },
      stats: {
        totalSpent,
        completedOrdersCount,
        averageOrderValue: Math.round(avgSpentValue),
        wishlistCount: wishlistProducts.length,
      },
      preferences: {
        favoriteShape,
        favoriteLength,
        favoriteCategory,
        favoriteCollection,
      },
      tags,
      segments,
      orders: ordersList,
      wishlist: wishlistProducts,
      recentlyViewed: recentlyViewedProducts,
      searches,
      coupons: couponsUsed,
      timeline,
    };

    return NextResponse.json(payload, { status: 200 });

  } catch (error: any) {
    console.error("GET /api/admin/customers/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
