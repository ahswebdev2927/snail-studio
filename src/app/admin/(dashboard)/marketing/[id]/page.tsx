import React from "react";
import { db } from "@/db";
import { marketingCampaigns, marketingCampaignRuns, marketingCampaignDeliveries, marketingRecipientSnapshots } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import CampaignDetailClient from "@/components/admin/marketing/campaign-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailsPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Load Campaign Metadata
  const campaign = await db.query.marketingCampaigns.findFirst({
    where: eq(marketingCampaigns.id, id),
  });

  if (!campaign) {
    notFound();
  }

  // 2. Real-Time Telemetry Sync Fallback on Reload
  // Query all local delivery logs still in 'sent' state
  const pendingDeliveries = await db.query.marketingCampaignDeliveries.findMany({
    where: and(
      eq(marketingCampaignDeliveries.campaignId, id),
      eq(marketingCampaignDeliveries.status, "sent")
    ),
  });

  if (pendingDeliveries.length > 0) {
    const { resend } = await import("@/services/email/resend.service");
    
    for (const dlv of pendingDeliveries) {
      if (dlv.resendMessageId && !dlv.resendMessageId.startsWith("mock_msg_")) {
        try {
          const res = await resend.emails.get(dlv.resendMessageId);
          if (res.data && res.data.last_event) {
            const statusEvent = res.data.last_event;
            if (statusEvent !== dlv.status) {
              const now = new Date();
              const updates: Partial<typeof marketingCampaignDeliveries.$inferInsert> = {
                status: statusEvent as any,
                updatedAt: now,
              };
              if (statusEvent === "opened") updates.openedAt = now;
              if (statusEvent === "clicked") {
                updates.clickedAt = now;
                updates.openedAt = now;
              }
              
              await db
                .update(marketingCampaignDeliveries)
                .set(updates)
                .where(eq(marketingCampaignDeliveries.id, dlv.id));
            }
          }
        } catch (syncErr) {
          console.error(`[Reload Sync] Failed syncing status for ${dlv.id}:`, syncErr);
        }
      }
    }
  }

  // 3. Query Run History
  const runs = await db.query.marketingCampaignRuns.findMany({
    where: eq(marketingCampaignRuns.campaignId, id),
    orderBy: [desc(marketingCampaignRuns.startedAt)],
  });

  // 4. Query Recipient Snapshots
  const snapshots = await db.query.marketingRecipientSnapshots.findMany({
    where: eq(marketingRecipientSnapshots.campaignId, id),
    orderBy: [desc(marketingRecipientSnapshots.createdAt)],
  });

  // 5. Query Delivery Reports
  const deliveries = await db.query.marketingCampaignDeliveries.findMany({
    where: eq(marketingCampaignDeliveries.campaignId, id),
    orderBy: [desc(marketingCampaignDeliveries.sentAt)],
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8 px-4">
      <CampaignDetailClient 
        campaign={campaign} 
        runs={runs} 
        snapshots={snapshots} 
        deliveries={deliveries} 
      />
    </div>
  );
}
