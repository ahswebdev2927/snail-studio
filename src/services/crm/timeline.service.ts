import { db } from "@/db";
import { 
  userAuditLogs, 
  orders, 
  orderStatusHistory, 
  reviews, 
  products, 
  wishlistItems, 
  wishlists, 
  searchLogs, 
  emailLogs, 
  couponUsage, 
  coupons 
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export interface TimelineEvent {
  id: string;
  type: 
    | "login" 
    | "order_placed" 
    | "order_status_update" 
    | "review_submitted" 
    | "wishlist_added" 
    | "search" 
    | "email" 
    | "coupon";
  title: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

/**
 * Aggregates and compiles all activities for a specific customer into a unified chronological feed.
 * 
 * @param userId Customer ID.
 * @param email Customer email (optional, used for campaign/system email logs lookup).
 */
export async function getCustomerTimeline(
  userId: string, 
  email?: string | null,
  options?: { type?: string }
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];
  const filterType = options?.type || "";

  try {
    // 1. Fetch Login events (from user_audit_logs)
    if (!filterType || filterType === "login") {
      const logins = await db
        .select({
          id: userAuditLogs.id,
          ipAddress: userAuditLogs.ipAddress,
          createdAt: userAuditLogs.createdAt,
        })
        .from(userAuditLogs)
        .where(and(eq(userAuditLogs.userId, userId), eq(userAuditLogs.action, "login")));

      for (const log of logins) {
        events.push({
          id: log.id,
          type: "login",
          title: "Customer Signed In",
          description: `Logged in successfully${log.ipAddress ? ` from IP address ${log.ipAddress}` : ""}.`,
          timestamp: log.createdAt,
        });
      }
    }

    // 2. Fetch Order Placed events
    if (!filterType || filterType === "orders") {
      const orderList = await db
        .select({
          id: orders.id,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
          status: orders.status,
        })
        .from(orders)
        .where(eq(orders.userId, userId));

      for (const ord of orderList) {
        const displayAmount = (ord.totalAmount / 100).toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        });
        events.push({
          id: `placed_${ord.id}`,
          type: "order_placed",
          title: "Order Placed",
          description: `Placed order ${ord.id} totaling ${displayAmount} (Status: ${ord.status}).`,
          timestamp: ord.createdAt,
          metadata: { orderId: ord.id },
        });
      }

      // 3. Fetch Order Status History updates
      const statusHistory = await db
        .select({
          id: orderStatusHistory.id,
          orderId: orderStatusHistory.orderId,
          status: orderStatusHistory.status,
          notes: orderStatusHistory.notes,
          createdAt: orderStatusHistory.createdAt,
        })
        .from(orderStatusHistory)
        .innerJoin(orders, eq(orderStatusHistory.orderId, orders.id))
        .where(eq(orders.userId, userId));

      for (const hist of statusHistory) {
        events.push({
          id: hist.id,
          type: "order_status_update",
          title: `Order Status: ${hist.status.toUpperCase()}`,
          description: `Order ${hist.orderId} transition to '${hist.status}'${hist.notes ? `. Note: ${hist.notes}` : ""}.`,
          timestamp: hist.createdAt,
          metadata: { orderId: hist.orderId, status: hist.status },
        });
      }
    }

    // 4. Fetch Review submissions
    if (!filterType || filterType === "reviews") {
      const reviewsList = await db
        .select({
          id: reviews.id,
          productId: reviews.productId,
          rating: reviews.rating,
          title: reviews.title,
          isApproved: reviews.isApproved,
          createdAt: reviews.createdAt,
          productName: products.name,
        })
        .from(reviews)
        .innerJoin(products, eq(reviews.productId, products.id))
        .where(eq(reviews.userId, userId));

      for (const rev of reviewsList) {
        events.push({
          id: rev.id,
          type: "review_submitted",
          title: `Review Submitted (${rev.rating} ★)`,
          description: `Wrote review for '${rev.productName}' - "${rev.title || ""}" (Status: ${rev.isApproved ? "Approved" : "Pending Moderation"}).`,
          timestamp: rev.createdAt,
          metadata: { productId: rev.productId, reviewId: rev.id },
        });
      }
    }

    // 5. Fetch Wishlist additions
    if (!filterType || filterType === "wishlist") {
      const wishlistAdds = await db
        .select({
          productId: wishlistItems.productId,
          createdAt: wishlistItems.createdAt,
          productName: products.name,
        })
        .from(wishlistItems)
        .innerJoin(wishlists, eq(wishlistItems.wishlistId, wishlists.id))
        .innerJoin(products, eq(wishlistItems.productId, products.id))
        .where(eq(wishlists.userId, userId));

      for (const item of wishlistAdds) {
        events.push({
          id: `wish_${userId}_${item.productId}_${item.createdAt.getTime()}`,
          type: "wishlist_added",
          title: "Added to Wishlist",
          description: `Added custom nail set '${item.productName}' to their favorites registry.`,
          timestamp: item.createdAt,
          metadata: { productId: item.productId },
        });
      }
    }

    // 6. Fetch Search Query logs
    if (!filterType || filterType === "search") {
      const searches = await db
        .select({
          id: searchLogs.id,
          query: searchLogs.query,
          resultsCount: searchLogs.resultsCount,
          createdAt: searchLogs.createdAt,
        })
        .from(searchLogs)
        .where(eq(searchLogs.userId, userId));

      for (const srch of searches) {
        events.push({
          id: srch.id,
          type: "search",
          title: "Searched Catalog",
          description: `Searched for phrase "${srch.query}" producing ${srch.resultsCount} matching sets.`,
          timestamp: srch.createdAt,
        });
      }
    }

    // 7. Fetch Email Logs
    if (email && (!filterType || filterType === "email")) {
      const emails = await db
        .select({
          id: emailLogs.id,
          recipient: emailLogs.recipient,
          subject: emailLogs.subject,
          templateName: emailLogs.templateName,
          status: emailLogs.status,
          sentAt: emailLogs.sentAt,
        })
        .from(emailLogs)
        .where(eq(emailLogs.recipient, email));

      for (const mail of emails) {
        events.push({
          id: mail.id,
          type: "email",
          title: `Email Sent: ${mail.status}`,
          description: `Dispatched system notification "${mail.subject}" (Template: ${mail.templateName}).`,
          timestamp: mail.sentAt,
        });
      }
    }

    // 8. Fetch Coupon Usage
    if (!filterType || filterType === "coupon") {
      const couponUses = await db
        .select({
          id: couponUsage.id,
          couponId: couponUsage.couponId,
          orderId: couponUsage.orderId,
          createdAt: couponUsage.createdAt,
          code: coupons.code,
        })
        .from(couponUsage)
        .innerJoin(coupons, eq(couponUsage.couponId, coupons.id))
        .where(eq(couponUsage.userId, userId));

      for (const use of couponUses) {
        events.push({
          id: use.id,
          type: "coupon",
          title: "Coupon Redeemed",
          description: `Applied coupon code "${use.code}" on order checkout ${use.orderId}.`,
          timestamp: use.createdAt,
          metadata: { couponId: use.couponId, orderId: use.orderId },
        });
      }
    }

  } catch (error) {
    console.error(`Error compiling timeline for user ${userId}:`, error);
  }

  // Sort events chronologically descending (newest first)
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
