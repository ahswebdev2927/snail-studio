import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, launchSubscribers, launchEvents } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendResendEmail } from "@/services/email/resend.service";
import { nanoid } from "nanoid";

async function handleRequest(request: Request) {
  try {
    // 1. Authorize Cron
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[Launch Scheduler] CRON_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: "Scheduler configuration error" }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Launch Scheduler] Unauthorized access attempt blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch all products currently in "Launching Soon" status
    const pendingProducts = await db.query.products.findMany({
      where: eq(products.status, "Launching Soon"),
    });

    console.log(`[Launch Scheduler] Found ${pendingProducts.length} launching soon products.`);

    const now = new Date();
    const nowTime = now.getTime();
    let processedCount = 0;
    const errors: string[] = [];

    for (const prod of pendingProducts) {
      if (!prod.launchDate) continue;

      // Calculate target launch time in IST (+5:30)
      const targetStr = `${prod.launchDate}T${prod.launchTime || "00:00"}:00+05:30`;
      const targetTime = new Date(targetStr).getTime();
      const diffMs = targetTime - nowTime;

      // Fetch all launch event logs for this product to prevent double sending
      const pastEvents = await db.query.launchEvents.findMany({
        where: eq(launchEvents.productId, prod.id),
      });
      const eventTypes = new Set(pastEvents.map((e) => e.eventType));

      // Fetch subscribers for this product
      const subs = await db.query.launchSubscribers.findMany({
        where: eq(launchSubscribers.productId, prod.id),
      });

      console.log(`[Launch Scheduler] Product: ${prod.name}, Subs: ${subs.length}, Diff: ${Math.round(diffMs / 1000 / 60)} mins`);

      // Determine appropriate action based on time difference
      let triggeredAction = false;
      let notificationType: "email_7d" | "email_3d" | "email_1d" | "email_launch" | null = null;
      let emailSubject = "";
      let emailBody = "";

      if (diffMs <= 0) {
        // --- LAUNCH TIME REACHED ---
        notificationType = "email_launch";
        emailSubject = `[Snail Studio] LIVE NOW: ${prod.name} is now available!`;
        emailBody = `The wait is over! "${prod.name}" has officially dropped.\n\nHandcrafted in limited salon batches, so get yours before it sells out!\n\nBuy Now: https://snail-studio.com/products/${prod.slug}`;

        // Perform auto publish if configured
        if (prod.autoPublish && prod.status === "Launching Soon") {
          console.log(`[Launch Scheduler] Auto-publishing product: ${prod.name}`);
          await db.transaction(async (tx) => {
            // Update product status to Active
            await tx
              .update(products)
              .set({
                status: "Active",
                isActive: true,
                updatedAt: now,
              })
              .where(eq(products.id, prod.id));

            // Log publish event
            if (!eventTypes.has("publish")) {
              await tx.insert(launchEvents).values({
                id: `lev_${nanoid(10)}`,
                productId: prod.id,
                eventType: "publish",
                metadata: JSON.stringify({ publishedAt: now.toISOString() }),
                createdAt: now,
              });
            }
          });
          triggeredAction = true;
        }
      } else if (diffMs <= 1 * 24 * 60 * 60 * 1000) {
        // --- 1 DAY REMINDER ---
        notificationType = "email_1d";
        emailSubject = `[Snail Studio] 24 Hours Left: ${prod.name} drop is tomorrow!`;
        emailBody = `Get ready! Only 24 hours remain until "${prod.name}" drops.\n\nSet your alarm to secure yours.\n\nPreview details: https://snail-studio.com/products/${prod.slug}`;
      } else if (diffMs <= 3 * 24 * 60 * 60 * 1000) {
        // --- 3 DAYS REMINDER ---
        notificationType = "email_3d";
        emailSubject = `[Snail Studio] 3 Days Until Drop: ${prod.name}!`;
        emailBody = `We are counting down! Just 3 days left until "${prod.name}" drops.\n\nPrepare your sizing profiles and wishlist now.\n\nPreview details: https://snail-studio.com/products/${prod.slug}`;
      } else if (diffMs <= 7 * 24 * 60 * 60 * 1000) {
        // --- 7 DAYS REMINDER ---
        notificationType = "email_7d";
        emailSubject = `[Snail Studio] 7 Days Until Drop: ${prod.name}!`;
        emailBody = `Only 1 week left until our exclusive handcrafted press-on set "${prod.name}" is released!\n\nView preview: https://snail-studio.com/products/${prod.slug}`;
      }

      // If notification is due and has not been sent yet
      if (notificationType && !eventTypes.has(notificationType)) {
        console.log(`[Launch Scheduler] Sending ${notificationType} to ${subs.length} subscribers for product ${prod.id}.`);

        for (const sub of subs) {
          try {
            await sendResendEmail({
              to: sub.email,
              subject: emailSubject,
              templateName: notificationType,
              html: `
                <div style="font-family: sans-serif; padding: 24px; color: #1c1917; background-color: #fbf9f6; border-radius: 16px;">
                  <h2 style="font-family: serif; font-weight: normal; margin-bottom: 16px; color: #3a2e2a;">Snail Studio Drop Alerts</h2>
                  <p style="font-size: 14px; line-height: 1.6; color: #57534e;">Hi ${sub.name || "there"},</p>
                  <p style="font-size: 14px; line-height: 1.6; color: #57534e; margin-bottom: 24px;">${emailBody.replace(/\n/g, "<br/>")}</p>
                  <a href="https://snail-studio.com/products/${prod.slug}" style="display: inline-block; padding: 12px 24px; background-color: #3a2e2a; color: #ffffff; text-decoration: none; border-radius: 24px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">View Collection Drop</a>
                  <p style="font-size: 11px; color: #a8a29e; margin-top: 40px; border-t: 1px solid #e7e5e4; padding-top: 16px;">You are receiving this because you subscribed to notifications for the ${prod.name} release at Snail Studio.</p>
                </div>
              `,
            });
          } catch (err: any) {
            console.error(`[Launch Scheduler] Failed sending email to ${sub.email}:`, err);
          }
        }

        // Insert launch event marker
        await db.insert(launchEvents).values({
          id: `lev_${nanoid(10)}`,
          productId: prod.id,
          eventType: notificationType,
          metadata: JSON.stringify({ sentCount: subs.length, triggeredAt: now.toISOString() }),
          createdAt: now,
        });

        triggeredAction = true;
      }

      if (triggeredAction) {
        processedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processedCount,
      errors,
    });
  } catch (error: any) {
    console.error("[Launch Scheduler] Unhandled error during cron invocation:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
