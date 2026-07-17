import { NextResponse } from "next/server";
import { db } from "@/db";
import { marketingCampaignDeliveries, emailMarketingPreferences, marketingSuppressions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string; // Resend message ID
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ResendWebhookPayload;
    
    if (!payload || !payload.type || !payload.data?.email_id) {
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
    }

    const eventType = payload.type;
    const resendMessageId = payload.data.email_id;

    console.log(`[Resend Webhook] Received event "${eventType}" for message: ${resendMessageId}`);

    // Find the matching campaign delivery log by the Resend message ID
    const delivery = await db.query.marketingCampaignDeliveries.findFirst({
      where: eq(marketingCampaignDeliveries.resendMessageId, resendMessageId),
    });

    if (!delivery) {
      console.warn(`[Resend Webhook] No matching delivery record found for Resend message ID: ${resendMessageId}`);
      return NextResponse.json({ success: true, message: "No action taken (delivery not found)" });
    }

    const now = new Date();
    const updates: Partial<typeof marketingCampaignDeliveries.$inferInsert> = {
      updatedAt: now,
    };

    let localOptOutNeeded = false;

    // Map Resend events to local database states
    switch (eventType) {
      case "email.delivered":
        if (delivery.status === "sent") {
          updates.status = "delivered";
        }
        break;

      case "email.opened":
        if (delivery.status === "sent" || delivery.status === "delivered") {
          updates.status = "opened";
        }
        if (!delivery.openedAt) {
          updates.openedAt = now;
        }
        break;

      case "email.clicked":
        updates.status = "clicked";
        if (!delivery.clickedAt) {
          updates.clickedAt = now;
        }
        if (!delivery.openedAt) {
          updates.openedAt = now;
        }
        break;

      case "email.bounced":
        updates.status = "bounced";
        updates.bouncedAt = now;
        localOptOutNeeded = true;
        break;

      case "email.complained":
        updates.status = "complained";
        localOptOutNeeded = true;
        break;

      case "email.failed":
        updates.status = "failed";
        break;

      case "email.unsubscribed":
        updates.status = "unsubscribed";
        updates.unsubscribedAt = now;
        localOptOutNeeded = true;
        break;

      default:
        console.log(`[Resend Webhook] Unhandled Resend event type: ${eventType}`);
        break;
    }

    // Apply delivery status updates
    await db
      .update(marketingCampaignDeliveries)
      .set(updates)
      .where(eq(marketingCampaignDeliveries.id, delivery.id));

    // Force automatic local opt-out if the email bounced, complained, or unsubscribed
    if (localOptOutNeeded && delivery.email) {
      console.log(`[Resend Webhook] Opting out recipient: ${delivery.email} due to event "${eventType}"`);
      
      // 1. Insert email into marketingSuppressions
      try {
        await db
          .insert(marketingSuppressions)
          .values({
            id: `sup_${nanoid(12)}`,
            email: delivery.email,
            reason: eventType === "email.bounced" ? "hard_bounce" : "complaint",
            createdAt: now,
          })
          .onConflictDoNothing();
      } catch (suppressionErr) {
        console.error("Failed to write to marketingSuppressions list:", suppressionErr);
      }

      // 2. Opt out of marketing preferences
      await db
        .insert(emailMarketingPreferences)
        .values({
          id: `pref_optout_${Date.now()}`,
          email: delivery.email,
          userId: delivery.userId,
          newsletter: false,
          promotions: false,
          launchNotifications: false,
          backInStock: false,
          productUpdates: false,
          priceDrops: false,
          unsubscribedAll: true,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: emailMarketingPreferences.email,
          set: {
            newsletter: false,
            promotions: false,
            launchNotifications: false,
            backInStock: false,
            productUpdates: false,
            priceDrops: false,
            unsubscribedAll: true,
            updatedAt: now,
          },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Resend Webhook] Error processing Resend webhook:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
