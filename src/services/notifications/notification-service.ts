import { db } from "@/db";
import { notifications, notificationPreferences, activityTimeline, pushSubscriptions, users } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sendToRole } from "./sse-manager";
import { sendMail } from "../email/email.service";
import { getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

export interface TriggerNotificationParams {
  category: "orders" | "inventory" | "reviews" | "system";
  title: string;
  message: string;
  priority?: "low" | "medium" | "high" | "critical";
  data?: {
    action?: string; // e.g. 'order_placed', 'stock_low'
    entityType?: string; // e.g. 'order', 'product'
    entityId?: string;
    [key: string]: any;
  };
}

/**
 * Main dispatcher to route notifications to all system administrators.
 */
export async function triggerAdminNotification(params: TriggerNotificationParams) {
  const { category, title, message, priority = "medium", data = {} } = params;

  // 1. Log to the system Activity Timeline
  const activityId = `act_${nanoid(12)}`;
  try {
    await db.insert(activityTimeline).values({
      id: activityId,
      userId: data.actorId || null,
      action: data.action || "system_event",
      entityType: data.entityType || "system",
      entityId: data.entityId || null,
      description: message,
      metadata: JSON.stringify(data),
    });

    // Broadcast the new activity log to connected admin SSE sockets
    sendToRole("admin", "new_activity", {
      id: activityId,
      action: data.action || "system_event",
      description: message,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to log activity timeline entry:", err);
  }

  // 2. Fetch all Administrator users
  let adminUsers: typeof users.$inferSelect[] = [];
  try {
    adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"));
  } catch (err) {
    console.error("Failed to fetch admin users for notification routing:", err);
    return;
  }

  for (const adminUser of adminUsers) {
    try {
      // 3. Resolve preference settings for this admin and category
      const pref = await db.query.notificationPreferences.findFirst({
        where: and(
          eq(notificationPreferences.userId, adminUser.id),
          eq(notificationPreferences.category, category)
        ),
      });

      const isEmailEnabled = pref ? pref.email : true;
      const isInAppEnabled = pref ? pref.inApp : true;
      const isPushEnabled = pref ? pref.push : true;

      // 4. In-App Notification (Database & SSE broadcast)
      if (isInAppEnabled) {
        const notifId = `ntf_${nanoid(12)}`;
        await db.insert(notifications).values({
          id: notifId,
          userId: adminUser.id,
          title,
          message,
          category,
          priority,
          read: false,
          data: JSON.stringify(data),
        });

        // Broadcast to admin role channel via SSE
        sendToRole("admin", "new_notification", {
          id: notifId,
          userId: adminUser.id,
          title,
          message,
          category,
          priority,
          data,
          createdAt: new Date().toISOString(),
        });
      }

      // 5. Email Notifications
      if (isEmailEnabled && adminUser.email) {
        await sendMail({
          to: adminUser.email,
          subject: `[Snail Studio Admin] ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #1a1a1a; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; font-weight: 500;">Snail Studio Notification</h2>
              <div style="padding: 15px 0; color: #333333; line-height: 1.6;">
                <p style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${title}</p>
                <p style="font-size: 14px; margin-top: 0;">${message}</p>
              </div>
              <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eaeaea; color: #888888; font-size: 11px;">
                <p>This is an automated operational notification sent to administrators. You can configure notification channels in your Admin Panel settings.</p>
              </div>
            </div>
          `,
          templateName: "admin_notification",
        });
      }

      // 6. Push Notifications via FCM (Firebase Cloud Messaging)
      if (isPushEnabled && getApps().length > 0) {
        const subscriptions = await db
          .select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, adminUser.id));

        const tokens = subscriptions.map((s) => s.token);

        if (tokens.length > 0) {
          try {
            const messaging = getMessaging();
            await messaging.sendEachForMulticast({
              tokens,
              notification: {
                title,
                body: message,
              },
              data: {
                category,
                action: data.action || "",
                entityType: data.entityType || "",
                entityId: data.entityId || "",
              },
            });
          } catch (fcmErr) {
            console.error(`FCM multicast dispatch failed for user ${adminUser.id}:`, fcmErr);
          }
        }
      }
    } catch (err) {
      console.error(`Failed routing notification to admin user ${adminUser.id}:`, err);
    }
  }
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationAsRead(notificationId: string, adminId: string) {
  return db
    .update(notifications)
    .set({
      read: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, adminId)
      )
    );
}

/**
 * Marks all unread notifications as read for a specific admin.
 */
export async function markAllNotificationsAsRead(adminId: string) {
  return db
    .update(notifications)
    .set({
      read: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.userId, adminId),
        eq(notifications.read, false)
      )
    );
}

/**
 * Retrieves paginated and filtered notifications for an administrator.
 */
export async function getAdminNotifications(
  adminId: string,
  options: {
    category?: "orders" | "inventory" | "reviews" | "system";
    status?: "all" | "unread" | "read";
    limit?: number;
    offset?: number;
  } = {}
) {
  const { category, status = "all", limit = 20, offset = 0 } = options;

  const conditions = [eq(notifications.userId, adminId)];

  if (category) {
    conditions.push(eq(notifications.category, category));
  }

  if (status === "unread") {
    conditions.push(eq(notifications.read, false));
  } else if (status === "read") {
    conditions.push(eq(notifications.read, true));
  }

  const query = db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(...conditions));

  const [results, countResult] = await Promise.all([query, countQuery]);
  const total = countResult[0]?.count || 0;

  return {
    notifications: results.map((r) => ({
      ...r,
      data: r.data ? JSON.parse(r.data) : null,
    })),
    total,
    limit,
    offset,
  };
}

/**
 * Fetches notification channel preference rules for an administrator.
 */
export async function getAdminNotificationPreferences(adminId: string) {
  return db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, adminId));
}

/**
 * Upserts a channel preference override for a specific alert category.
 */
export async function updateAdminNotificationPreferences(
  adminId: string,
  category: "orders" | "inventory" | "reviews" | "system",
  prefs: {
    email?: boolean;
    inApp?: boolean;
    push?: boolean;
  }
) {
  const existing = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, adminId),
      eq(notificationPreferences.category, category)
    ),
  });

  const timestamp = new Date();

  if (existing) {
    return db
      .update(notificationPreferences)
      .set({
        email: prefs.email !== undefined ? prefs.email : existing.email,
        inApp: prefs.inApp !== undefined ? prefs.inApp : existing.inApp,
        push: prefs.push !== undefined ? prefs.push : existing.push,
        updatedAt: timestamp,
      })
      .where(eq(notificationPreferences.id, existing.id));
  } else {
    return db.insert(notificationPreferences).values({
      id: `prf_${nanoid(12)}`,
      userId: adminId,
      category,
      email: prefs.email !== undefined ? prefs.email : true,
      inApp: prefs.inApp !== undefined ? prefs.inApp : true,
      push: prefs.push !== undefined ? prefs.push : true,
      updatedAt: timestamp,
    });
  }
}
