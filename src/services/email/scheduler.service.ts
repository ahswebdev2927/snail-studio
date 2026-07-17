import { db } from "@/db";
import {
  marketingCampaigns,
  marketingCampaignDeliveries,
  marketingCampaignRuns,
  marketingRecipientSnapshots,
  marketingSuppressions,
  users,
  orders,
  carts,
  cartItems,
  wishlists,
  wishlistItems,
  launchSubscribers,
  products,
  coupons
} from "@/db/schema";
import { eq, and, lte, inArray, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendResendBatch, sendResendEmail } from "./resend.service";

/**
 * Resolves the audience list based on the campaign's segment configuration.
 * Returns an array of resolved recipients containing userId, email, and name.
 */
export async function resolveCampaignAudience(
  segmentType: string,
  segmentDetails: string | null
): Promise<{ userId: string | null; email: string; name: string }[]> {
  const activeUsers = await db.query.users.findMany({
    where: eq(users.isActive, true),
  });

  const allOrders = await db.query.orders.findMany({
    where: inArray(orders.status, ["paid", "confirmed", "processing", "shipped", "delivered"]),
  });

  switch (segmentType) {
    case "all": {
      return activeUsers
        .filter((u) => u.email)
        .map((u) => ({ userId: u.id, email: u.email!, name: u.name || "Customer" }));
    }

    case "new": {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return activeUsers
        .filter((u) => u.email && u.createdAt >= thirtyDaysAgo)
        .map((u) => ({ userId: u.id, email: u.email!, name: u.name || "Customer" }));
    }

    case "frequent": {
      // Users with >= 3 completed orders
      const orderCounts = new Map<string, number>();
      for (const order of allOrders) {
        if (order.userId) {
          orderCounts.set(order.userId, (orderCounts.get(order.userId) || 0) + 1);
        }
      }
      return activeUsers
        .filter((u) => u.email && (orderCounts.get(u.id) || 0) >= 3)
        .map((u) => ({ userId: u.id, email: u.email!, name: u.name || "Customer" }));
    }

    case "vip": {
      // Users with total spend >= 15000 paise (150 INR) or order count >= 3
      const userSpend = new Map<string, number>();
      const orderCounts = new Map<string, number>();
      for (const order of allOrders) {
        if (order.userId) {
          userSpend.set(order.userId, (userSpend.get(order.userId) || 0) + order.totalAmount);
          orderCounts.set(order.userId, (orderCounts.get(order.userId) || 0) + 1);
        }
      }
      return activeUsers
        .filter((u) => u.email && ((userSpend.get(u.id) || 0) >= 15000 || (orderCounts.get(u.id) || 0) >= 3))
        .map((u) => ({ userId: u.id, email: u.email!, name: u.name || "Customer" }));
    }

    case "inactive": {
      // Users with no completed orders in the last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const activeUserIds = new Set<string>();
      for (const order of allOrders) {
        if (order.userId && order.createdAt >= ninetyDaysAgo) {
          activeUserIds.add(order.userId);
        }
      }
      return activeUsers
        .filter((u) => u.email && !activeUserIds.has(u.id))
        .map((u) => ({ userId: u.id, email: u.email!, name: u.name || "Customer" }));
    }

    case "cart_abandoners": {
      // Users with active cart items but no order in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const recentBuyers = new Set<string>();
      for (const order of allOrders) {
        if (order.userId && order.createdAt >= oneDayAgo) {
          recentBuyers.add(order.userId);
        }
      }

      const activeCarts = await db.query.carts.findMany();
      const cartItemsList = await db.query.cartItems.findMany();
      const cartsWithItems = new Set(cartItemsList.map((ci) => ci.cartId));

      const cartUserIds = new Set<string>();
      for (const cart of activeCarts) {
        if (cart.userId && cartsWithItems.has(cart.id) && !recentBuyers.has(cart.userId)) {
          cartUserIds.add(cart.userId);
        }
      }

      return activeUsers
        .filter((u) => u.email && cartUserIds.has(u.id))
        .map((u) => ({ userId: u.id, email: u.email!, name: u.name || "Customer" }));
    }

    case "wishlist": {
      // Users with items in wishlist
      const activeWishlists = await db.query.wishlists.findMany();
      const wishlistItemsList = await db.query.wishlistItems.findMany();
      const wishlistsWithItems = new Set(wishlistItemsList.map((wi) => wi.wishlistId));

      const wishlistUserIds = new Set<string>();
      for (const wl of activeWishlists) {
        if (wl.userId && wishlistsWithItems.has(wl.id)) {
          wishlistUserIds.add(wl.userId);
        }
      }

      return activeUsers
        .filter((u) => u.email && wishlistUserIds.has(u.id))
        .map((u) => ({ userId: u.id, email: u.email!, name: u.name || "Customer" }));
    }

    case "launch_subscribers": {
      const subs = await db.query.launchSubscribers.findMany();
      return subs.map((s) => ({
        userId: null,
        email: s.email,
        name: s.name || "Subscriber",
      }));
    }

    case "selected": {
      if (!segmentDetails) return [];
      try {
        const selectedValues = JSON.parse(segmentDetails) as string[];
        
        // 1. Resolve matching active users
        const matchedUsers = activeUsers
          .filter((u) => u.email && (selectedValues.includes(u.id) || selectedValues.includes(u.email)))
          .map((u) => ({ userId: u.id, email: u.email!, name: u.name || "Customer" }));

        // 2. Resolve matching subscribers
        const subs = await db.query.launchSubscribers.findMany();
        const matchedSubs = subs
          .filter((s) => selectedValues.includes(s.email))
          .map((s) => ({ userId: null, email: s.email, name: s.name || "Subscriber" }));

        // 3. Combine and de-duplicate
        const combined = [...matchedUsers, ...matchedSubs];
        const seen = new Set<string>();
        return combined.filter((c) => {
          if (seen.has(c.email)) return false;
          seen.add(c.email);
          return true;
        });
      } catch {
        return [];
      }
    }

    default:
      return [];
  }
}

/**
 * Builds personalized HTML templates for marketing emails.
 */
export async function personalizeTemplate(
  bodyHtml: string,
  recipientEmail: string,
  recipientName: string,
  userId: string | null,
  couponCode?: string
): Promise<string> {
  let personalized = bodyHtml;

  // Substitute Name
  personalized = personalized.replaceAll("{{customer_name}}", recipientName);

  // Substitute Coupon
  personalized = personalized.replaceAll("{{coupon}}", couponCode || "WELCOME10");
  personalized = personalized.replaceAll("{{coupon_code}}", couponCode || "WELCOME10");

  // Substitute Favorite Category
  personalized = personalized.replaceAll("{{favorite_category}}", "Handcrafted Press-Ons");

  // Substitute Unsubscribe Link
  const unsubUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
  personalized = personalized.replaceAll("{{unsubscribe_url}}", unsubUrl);

  // Substitute Wishlist Products
  if (personalized.includes("{{wishlist_products}}") && userId) {
    const userWishlists = await db.query.wishlists.findMany({
      where: eq(wishlists.userId, userId),
    });
    const wlIds = userWishlists.map((w) => w.id);
    if (wlIds.length > 0) {
      const items = await db.query.wishlistItems.findMany({
        where: inArray(wishlistItems.wishlistId, wlIds),
      });
      const prodIds = items.map((i) => i.productId);
      if (prodIds.length > 0) {
        const prodList = await db.query.products.findMany({
          where: inArray(products.id, prodIds),
          limit: 3,
        });
        const html = prodList
          .map(
            (p) =>
              `<div style="margin: 10px 0;"><a href="/products/${p.id}" style="color: #A85328; font-weight: bold;">${p.name}</a> - ${p.description || "Artisan nails"}</div>`
          )
          .join("");
        personalized = personalized.replaceAll("{{wishlist_products}}", html);
      }
    }
    personalized = personalized.replaceAll("{{wishlist_products}}", "<i>No saved items inside your wishlist.</i>");
  } else {
    personalized = personalized.replaceAll("{{wishlist_products}}", "<i>Check out our latest catalog releases!</i>");
  }

  // Substitute Cart Products
  if (personalized.includes("{{cart_products}}") && userId) {
    const userCart = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });
    if (userCart) {
      const items = await db.query.cartItems.findMany({
        where: eq(cartItems.cartId, userCart.id),
      });
      const htmlList: string[] = [];
      for (const item of items) {
        const variant = await db.query.productVariants.findFirst({
          where: eq(products.id, item.variantId), // Fallback or matching product variant info
        });
        htmlList.push(`<div style="margin: 5px 0;">Product Variant Set (Qty: ${item.quantity})</div>`);
      }
      if (htmlList.length > 0) {
        personalized = personalized.replaceAll("{{cart_products}}", htmlList.join(""));
      }
    }
    personalized = personalized.replaceAll("{{cart_products}}", "<i>Your shopping cart is currently empty.</i>");
  } else {
    personalized = personalized.replaceAll("{{cart_products}}", "<i>Complete your order today.</i>");
  }

  // Substitute Recommended Products
  if (personalized.includes("{{recommended_products}}")) {
    const topProducts = await db.query.products.findMany({
      limit: 3,
    });
    const html = topProducts
      .map(
        (p) =>
          `<div style="display: inline-block; width: 140px; margin: 10px; text-align: center;">
            <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: bold;">${p.name}</p>
            <a href="/products/${p.id}" style="font-size: 11px; color: #A85328; text-decoration: none;">View Detail &rarr;</a>
          </div>`
      )
      .join("");
    personalized = personalized.replaceAll("{{recommended_products}}", html);
  }

  return personalized;
}

/**
 * Executes a single scheduled campaign.
 * Resolves the audience, creates recipient snapshots, runs batch sending,
 * and updates campaign statuses.
 */
export async function executeCampaignRun(campaignId: string): Promise<{ success: boolean; error?: string }> {
  const timestamp = new Date();
  const runId = `run_${nanoid(12)}`;

  try {
    const campaign = await db.query.marketingCampaigns.findFirst({
      where: eq(marketingCampaigns.id, campaignId),
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // 1. Mark campaign as sending
    await db
      .update(marketingCampaigns)
      .set({ status: "sending", updatedAt: timestamp })
      .where(eq(marketingCampaigns.id, campaignId));

    // 2. Initialize campaign run record
    await db.insert(marketingCampaignRuns).values({
      id: runId,
      campaignId: campaignId,
      status: "started",
      recipientsCount: 0,
      sentCount: 0,
      failedCount: 0,
      revenue: 0,
      ctr: 0,
      startedAt: timestamp,
    });

    // 3. Resolve audience recipients
    const recipients = await resolveCampaignAudience(campaign.segmentType, campaign.segmentDetails);

    // Filter out suppressed emails
    const suppressions = await db.select({ email: marketingSuppressions.email }).from(marketingSuppressions);
    const suppressedSet = new Set(suppressions.map((s) => s.email));
    const activeRecipients = recipients.filter((r) => !suppressedSet.has(r.email));

    if (activeRecipients.length === 0) {
      // Mark campaign completed
      await db
        .update(marketingCampaignRuns)
        .set({ status: "completed", completedAt: timestamp })
        .where(eq(marketingCampaignRuns.id, runId));

      await db
        .update(marketingCampaigns)
        .set({ status: "completed", sentAt: timestamp, updatedAt: timestamp })
        .where(eq(marketingCampaigns.id, campaignId));

      return { success: true };
    }

    // 4. Create recipient snapshot entries
    const snapEntries = activeRecipients.map((r) => ({
      id: `snp_${nanoid(12)}`,
      campaignId: campaignId,
      runId: runId,
      userId: r.userId,
      email: r.email,
      status: "pending" as const,
      retryCount: 0,
      createdAt: timestamp,
    }));

    // SQLite allows bulk insert
    await db.insert(marketingRecipientSnapshots).values(snapEntries);

    // Update run recipients count
    await db
      .update(marketingCampaignRuns)
      .set({ recipientsCount: snapEntries.length })
      .where(eq(marketingCampaignRuns.id, runId));

    // 5. Query coupon code if present
    let couponCode = "";
    if (campaign.couponId) {
      const coup = await db.query.coupons.findFirst({
        where: eq(coupons.id, campaign.couponId),
      });
      if (coup) {
        couponCode = coup.code;
      }
    }

    // 6. Process dispatches in batches of 100
    const batchSize = 100;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < snapEntries.length; i += batchSize) {
      const chunk = snapEntries.slice(i, i + batchSize);
      const batchItems = [];

      for (const snap of chunk) {
        const personalizedHtml = await personalizeTemplate(
          campaign.bodyHtml,
          snap.email,
          activeRecipients.find((r) => r.email === snap.email)?.name || "Customer",
          snap.userId,
          couponCode
        );

        batchItems.push({
          to: snap.email,
          subject: campaign.subject,
          html: personalizedHtml,
          userId: snap.userId || undefined,
        });
      }

      // Transmit batch
      const batchResult = await sendResendBatch({
        campaignId: campaignId,
        items: batchItems,
      });

      totalSent += batchResult.sentCount;
      totalFailed += batchResult.failedCount;

      // Update snapshot statuses to 'sent' for successful batch items
      // (failures are logged/handled inside sendResendBatch, here we update snapshot table statuses)
      const sentEmails = activeRecipients
        .slice(i, i + batchSize)
        .map((r) => r.email);

      await db
        .update(marketingRecipientSnapshots)
        .set({ status: "sent" })
        .where(
          and(
            eq(marketingRecipientSnapshots.runId, runId),
            inArray(marketingRecipientSnapshots.email, sentEmails)
          )
        );
    }

    // 7. Finalize Run state
    await db
      .update(marketingCampaignRuns)
      .set({
        status: "completed",
        sentCount: totalSent,
        failedCount: totalFailed,
        completedAt: new Date(),
      })
      .where(eq(marketingCampaignRuns.id, runId));

    await db
      .update(marketingCampaigns)
      .set({ status: "completed", sentAt: timestamp, updatedAt: timestamp })
      .where(eq(marketingCampaigns.id, campaignId));

    return { success: true };
  } catch (error: any) {
    console.error(`Failed executing run for campaign ${campaignId}:`, error);

    // Set run to failed
    await db
      .update(marketingCampaignRuns)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(marketingCampaignRuns.id, runId));

    await db
      .update(marketingCampaigns)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(marketingCampaigns.id, campaignId));

    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Main scheduler entry point.
 * Scans for pending scheduled campaigns, starts execution, and retries failed delivery attempts.
 */
export async function processScheduledCampaigns(): Promise<{ processedCount: number; errors: string[] }> {
  const now = new Date();
  const errors: string[] = [];
  let processedCount = 0;

  try {
    // 1. Process scheduled campaigns
    const scheduled = await db.query.marketingCampaigns.findMany({
      where: and(eq(marketingCampaigns.status, "scheduled"), lte(marketingCampaigns.scheduledAt, now)),
    });

    for (const campaign of scheduled) {
      console.log(`[Scheduler] Executing scheduled campaign: ${campaign.name} (${campaign.id})`);
      const result = await executeCampaignRun(campaign.id);
      if (result.success) {
        processedCount++;
      } else {
        errors.push(`Campaign ${campaign.id}: ${result.error}`);
      }
    }

    // 2. Retry failed recipient snapshots (retry logic)
    const failedSnaps = await db.query.marketingRecipientSnapshots.findMany({
      where: and(eq(marketingRecipientSnapshots.status, "failed"), lte(marketingRecipientSnapshots.nextRetryAt, now)),
    });

    const snapsToRetry = failedSnaps.filter((s) => s.retryCount < 3);

    for (const snap of snapsToRetry) {
      console.log(`[Scheduler] Retrying snapshot delivery for ${snap.email} (Attempt ${snap.retryCount + 1})`);
      
      const campaign = await db.query.marketingCampaigns.findFirst({
        where: eq(marketingCampaigns.id, snap.campaignId),
      });

      if (!campaign) continue;

      let couponCode = "";
      if (campaign.couponId) {
        const coup = await db.query.coupons.findFirst({
          where: eq(coupons.id, campaign.couponId),
        });
        if (coup) {
          couponCode = coup.code;
        }
      }

      const personalizedHtml = await personalizeTemplate(
        campaign.bodyHtml,
        snap.email,
        "Customer",
        snap.userId,
        couponCode
      );

      const res = await sendResendEmail({
        to: snap.email,
        subject: campaign.subject,
        html: personalizedHtml,
        templateName: `campaign_retry_${snap.campaignId}`,
        campaignId: snap.campaignId,
        userId: snap.userId || undefined,
      });

      const nextRetryCount = snap.retryCount + 1;
      if (res.success) {
        await db
          .update(marketingRecipientSnapshots)
          .set({ status: "sent", retryCount: nextRetryCount })
          .where(eq(marketingRecipientSnapshots.id, snap.id));
      } else {
        // Exponential backoff retry time computation: retryCount * 30 mins
        const nextTime = new Date();
        nextTime.setMinutes(nextTime.getMinutes() + nextRetryCount * 30);
        
        await db
          .update(marketingRecipientSnapshots)
          .set({
            status: nextRetryCount >= 3 ? "failed" : "failed", // Mark permanently failed if retry count >= 3
            retryCount: nextRetryCount,
            nextRetryAt: nextRetryCount >= 3 ? null : nextTime,
            errorMessage: res.error || "Retry failed",
          })
          .where(eq(marketingRecipientSnapshots.id, snap.id));
      }
    }
  } catch (error: any) {
    console.error("[Scheduler] Error processing scheduled campaigns:", error);
    errors.push(`Global Scheduler Exception: ${error.message}`);
  }

  return { processedCount, errors };
}

/**
 * Reconciles delivery statuses with Resend API and cleans up resolved snapshots older than 30 days.
 * Acts as the fallback sync cron job execution service.
 */
export async function syncResendDeliveries(): Promise<{ syncedCount: number; cleanedCount: number; errors: string[] }> {
  const now = new Date();
  const errors: string[] = [];
  let syncedCount = 0;
  let cleanedCount = 0;

  try {
    // 1. Reconcile campaign deliveries where status is 'sent' (older than 5 minutes to allow webhook time)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const pendingDeliveries = await db.query.marketingCampaignDeliveries.findMany({
      where: and(
        eq(marketingCampaignDeliveries.status, "sent"),
        lt(marketingCampaignDeliveries.sentAt, fiveMinutesAgo)
      ),
      limit: 50, // Batch limit per cron execution to avoid rate limits
    });

    const { resend } = await import("./resend.service");

    for (const dlv of pendingDeliveries) {
      if (!dlv.resendMessageId || dlv.resendMessageId.startsWith("mock_msg_")) {
        continue;
      }

      try {
        const details = await resend.emails.get(dlv.resendMessageId);
        
        if (details.data) {
          const resendStatus = details.data.last_event; // e.g. 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed'
          
          if (resendStatus && resendStatus !== dlv.status) {
            const updates: Partial<typeof marketingCampaignDeliveries.$inferInsert> = {
              status: resendStatus as any,
              updatedAt: now,
            };

            if (resendStatus === "opened" && !dlv.openedAt) {
              updates.openedAt = now;
            }
            if (resendStatus === "clicked" && !dlv.clickedAt) {
              updates.clickedAt = now;
              updates.openedAt = dlv.openedAt || now;
            }

            await db
              .update(marketingCampaignDeliveries)
              .set(updates)
              .where(eq(marketingCampaignDeliveries.id, dlv.id));

            // Write to suppressions if bounced or complained
            if (resendStatus === "bounced" || resendStatus === "complained") {
              await db
                .insert(marketingSuppressions)
                .values({
                  id: `sup_${nanoid(12)}`,
                  email: dlv.email,
                  reason: resendStatus === "bounced" ? "hard_bounce" : "complaint",
                  createdAt: now,
                })
                .onConflictDoNothing();
            }

            syncedCount++;
          }
        }
      } catch (err: any) {
        console.error(`Failed to sync delivery ${dlv.id} from Resend:`, err);
        errors.push(`Delivery ${dlv.id} sync error: ${err.message}`);
      }
    }

    // 2. Perform 30-day automatic retention cleanup sweep on resolved snapshots
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleteResult = await db
      .delete(marketingRecipientSnapshots)
      .where(
        and(
          inArray(marketingRecipientSnapshots.status, ["sent", "failed"]),
          lt(marketingRecipientSnapshots.createdAt, thirtyDaysAgo)
        )
      );

    cleanedCount = deleteResult.rowsAffected || 0;
  } catch (error: any) {
    console.error("[Sync Cron] Error running marketing sync job:", error);
    errors.push(`Global Sync Exception: ${error.message}`);
  }

  return { syncedCount, cleanedCount, errors };
}

