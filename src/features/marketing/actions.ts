"use server";

import { db } from "@/db";
import { marketingCampaigns, marketingCampaignRuns, users, coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { executeCampaignRun, personalizeTemplate } from "@/services/email/scheduler.service";
import { sendResendEmail } from "@/services/email/resend.service";

export interface CreateCampaignInput {
  name: string;
  subject: string;
  campaignType: typeof marketingCampaigns.$inferInsert.campaignType;
  segmentType: typeof marketingCampaigns.$inferInsert.segmentType;
  segmentDetails?: string | null;
  templateName: string;
  bodyHtml: string;
  bodyJson?: string;
  couponId: string | null;
  featuredProductIds?: string;
  scheduleType: "immediate" | "scheduled" | "draft";
  scheduledAtString?: string;
}

/**
 * Creates a new marketing campaign.
 * Immediately executes if the scheduleType is "immediate".
 */
export async function createCampaignAction(input: CreateCampaignInput) {
  const campaignId = `camp_${nanoid(12)}`;
  let status: typeof marketingCampaigns.$inferInsert.status = "draft";
  let scheduledAt: Date | null = null;

  if (input.scheduleType === "immediate") {
    status = "sending";
  } else if (input.scheduleType === "scheduled" && input.scheduledAtString) {
    status = "scheduled";
    scheduledAt = new Date(input.scheduledAtString);
  }

  try {
    await db.insert(marketingCampaigns).values({
      id: campaignId,
      name: input.name,
      subject: input.subject,
      campaignType: input.campaignType,
      segmentType: input.segmentType,
      segmentDetails: input.segmentDetails || null,
      templateName: input.templateName,
      bodyHtml: input.bodyHtml,
      bodyJson: input.bodyJson || null,
      couponId: input.couponId,
      featuredProductIds: input.featuredProductIds || null,
      status: status,
      scheduledAt: scheduledAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (input.scheduleType === "immediate") {
      // Trigger run execution synchronously
      await executeCampaignRun(campaignId);
    }
  } catch (error: any) {
    console.error("[Actions] Failed to create campaign:", error);
    return { success: false, error: error.message || "Failed to create campaign" };
  }

  revalidatePath("/admin/marketing");
  redirect("/admin/marketing");
}

/**
 * Deletes a marketing campaign by ID.
 */
export async function deleteCampaignAction(id: string) {
  try {
    await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    revalidatePath("/admin/marketing");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Triggers a manual immediate run of an existing campaign.
 */
export async function sendCampaignNowAction(id: string) {
  try {
    const res = await executeCampaignRun(id);
    revalidatePath(`/admin/marketing/${id}`);
    return res;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Dispatches a manual targeted wishlist reminder email to a customer from Customer 360 profile.
 */
export async function sendTargetedWishlistEmailAction(
  userId: string,
  couponId: string | null,
  customSubject?: string | null,
  customBodyHtml?: string | null
) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.email) {
      return { success: false, error: "Recipient email address not found" };
    }

    let couponCode = "";
    if (couponId) {
      const coup = await db.query.coupons.findFirst({
        where: eq(coupons.id, couponId),
      });
      if (coup) {
        couponCode = coup.code;
      }
    }

    const subject = customSubject || "Items in your Snail Studios wishlist are waiting for you!";
    // Wishlist reminder email body template
    const bodyTemplate = customBodyHtml || `
      <html>
        <body style="font-family: Arial, sans-serif; color: #2C2520; background-color: #FCFAF7; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border: 1px solid #EAE6DF; border-radius: 15px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
            <h1 style="color: #A85328; font-family: Georgia, serif; font-size: 24px; text-align: center; margin-bottom: 25px;">Your Saved Styles Await</h1>
            <p>Hello ${user.name || "Customer"},</p>
            <p>We noticed you saved some premium, reusable press-on nail sets in your wishlist. Because our artists paint each set by hand in small batches, popular designs and sizes sell out quickly.</p>
            
            <h3 style="color: #A85328; border-bottom: 1px solid #EAE6DF; padding-bottom: 8px; margin-top: 25px;">Saved Items in Your Wishlist</h3>
            <div style="margin: 20px 0;">
              {{wishlist_products}}
            </div>

            ${
              couponCode
                ? `<div style="border: 2px dashed #A85328; background-color: #FAF6F0; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0;">
                    <p style="margin: 0; font-size: 13px; color: #666;">Claim a special discount on your wishlist items at checkout:</p>
                    <h2 style="font-family: monospace; font-size: 24px; margin: 8px 0; color: #A85328; letter-spacing: 2px;">${couponCode}</h2>
                   </div>`
                : ""
            }

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/shop" style="background-color: #A85328; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px;">Return & Order Now</a>
            </p>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #EAE6DF; padding-top: 15px;">
              Snail Studios &bull; Premium Reusable Handcrafted Press-On Nails
            </p>
          </div>
        </body>
      </html>
    `;

    const personalizedHtml = await personalizeTemplate(
      bodyTemplate,
      user.email,
      user.name || "Customer",
      userId,
      couponCode
    );

    const campaignId = `camp_${nanoid(12)}`;
    const runId = `run_${nanoid(12)}`;
    const timestamp = new Date();

    const dateStr = timestamp.toISOString().split("T")[0];
    const timeStr = timestamp.toTimeString().split(" ")[0].replace(/:/g, "-");
    const campaignName = `${userId}_wishlist_${dateStr}_${timeStr}`;

    // 1. Create a campaign record
    await db.insert(marketingCampaigns).values({
      id: campaignId,
      name: campaignName,
      subject: subject,
      campaignType: "wishlist_reminder",
      segmentType: "wishlist",
      templateName: "targeted_wishlist_reminder",
      bodyHtml: bodyTemplate,
      couponId: couponId,
      status: "completed",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // 2. Create a campaign run record
    await db.insert(marketingCampaignRuns).values({
      id: runId,
      campaignId: campaignId,
      status: "completed",
      recipientsCount: 1,
      sentCount: 1,
      failedCount: 0,
      startedAt: timestamp,
      completedAt: timestamp,
    });

    const res = await sendResendEmail({
      to: user.email,
      subject: "Items in your Snail Studios wishlist are waiting for you!",
      html: personalizedHtml,
      templateName: "targeted_wishlist_reminder",
      campaignId: campaignId,
      userId: userId,
    });

    if (!res.success) {
      // Revert run stats to failed on error
      await db
        .update(marketingCampaignRuns)
        .set({ sentCount: 0, failedCount: 1, status: "failed" })
        .where(eq(marketingCampaignRuns.id, runId));

      await db
        .update(marketingCampaigns)
        .set({ status: "failed" })
        .where(eq(marketingCampaigns.id, campaignId));
    }

    return res;
  } catch (error: any) {
    console.error("[Actions] Failed to send targeted wishlist reminder:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

/**
 * Dispatches a manual targeted cart recovery email to a customer from Customer 360 profile.
 */
export async function sendTargetedCartAbandonedEmailAction(
  userId: string,
  couponId: string | null,
  customSubject?: string | null,
  customBodyHtml?: string | null
) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.email) {
      return { success: false, error: "Recipient email address not found" };
    }

    let couponCode = "";
    if (couponId) {
      const coup = await db.query.coupons.findFirst({
        where: eq(coupons.id, couponId),
      });
      if (coup) {
        couponCode = coup.code;
      }
    }

    const subject = customSubject || "Still thinking about your Snail Studios cart items?";
    // Cart recovery email body template
    const bodyTemplate = customBodyHtml || `
      <html>
        <body style="font-family: Arial, sans-serif; color: #2C2520; background-color: #FCFAF7; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border: 1px solid #EAE6DF; border-radius: 15px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
            <h1 style="color: #A85328; font-family: Georgia, serif; font-size: 24px; text-align: center; margin-bottom: 25px;">Don't Leave Your Nails Behind</h1>
            <p>Hello ${user.name || "Customer"},</p>
            <p>We saved the handcrafted sets left in your shopping cart. Because our nail sets are painted by hand in limited batches, your cart reservation will expire soon and items may sell out.</p>
            
            <h3 style="color: #A85328; border-bottom: 1px solid #EAE6DF; padding-bottom: 8px; margin-top: 25px;">Items in Your Shopping Cart</h3>
            <div style="margin: 20px 0;">
              {{cart_products}}
            </div>

            ${
              couponCode
                ? `<div style="border: 2px dashed #A85328; background-color: #FAF6F0; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0;">
                    <p style="margin: 0; font-size: 13px; color: #666;">Complete your cart checkout today with this exclusive discount code:</p>
                    <h2 style="font-family: monospace; font-size: 24px; margin: 8px 0; color: #A85328; letter-spacing: 2px;">${couponCode}</h2>
                   </div>`
                : ""
            }

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/cart" style="background-color: #A85328; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px;">Complete My Checkout</a>
            </p>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #EAE6DF; padding-top: 15px;">
              Snail Studios &bull; Premium Reusable Handcrafted Press-On Nails
            </p>
          </div>
        </body>
      </html>
    `;

    const personalizedHtml = await personalizeTemplate(
      bodyTemplate,
      user.email,
      user.name || "Customer",
      userId,
      couponCode
    );

    const campaignId = `camp_${nanoid(12)}`;
    const runId = `run_${nanoid(12)}`;
    const timestamp = new Date();

    const dateStr = timestamp.toISOString().split("T")[0];
    const timeStr = timestamp.toTimeString().split(" ")[0].replace(/:/g, "-");
    const campaignName = `${userId}_cart_${dateStr}_${timeStr}`;

    // 1. Create a campaign record
    await db.insert(marketingCampaigns).values({
      id: campaignId,
      name: campaignName,
      subject: subject,
      campaignType: "cart_recovery",
      segmentType: "cart_abandoners",
      templateName: "targeted_cart_recovery",
      bodyHtml: bodyTemplate,
      couponId: couponId,
      status: "completed",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // 2. Create a campaign run record
    await db.insert(marketingCampaignRuns).values({
      id: runId,
      campaignId: campaignId,
      status: "completed",
      recipientsCount: 1,
      sentCount: 1,
      failedCount: 0,
      startedAt: timestamp,
      completedAt: timestamp,
    });

    const res = await sendResendEmail({
      to: user.email,
      subject: "Still thinking about your Snail Studios cart items?",
      html: personalizedHtml,
      templateName: "targeted_cart_recovery",
      campaignId: campaignId,
      userId: userId,
    });

    if (!res.success) {
      // Revert run stats to failed on error
      await db
        .update(marketingCampaignRuns)
        .set({ sentCount: 0, failedCount: 1, status: "failed" })
        .where(eq(marketingCampaignRuns.id, runId));

      await db
        .update(marketingCampaigns)
        .set({ status: "failed" })
        .where(eq(marketingCampaigns.id, campaignId));
    }

    return res;
  } catch (error: any) {
    console.error("[Actions] Failed to send targeted cart recovery:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}
