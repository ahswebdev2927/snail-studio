import React from "react";
import { db } from "@/db";
import { marketingCampaigns, marketingCampaignRuns, marketingCampaignDeliveries } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Sparkles, Plus, Calendar, Mail, FileText, Send, CheckCircle, BarChart3, Trash2, ArrowUpRight, TrendingUp } from "lucide-react";
import { deleteCampaignAction } from "@/features/marketing/actions";

export const dynamic = "force-dynamic";

export default async function MarketingDashboardPage() {
  const campaignsList = await db.query.marketingCampaigns.findMany({
    orderBy: [desc(marketingCampaigns.createdAt)],
  });

  const runsList = await db.query.marketingCampaignRuns.findMany({
    orderBy: [desc(marketingCampaignRuns.startedAt)],
    limit: 10,
  });

  const deliveriesList = await db.query.marketingCampaignDeliveries.findMany();

  // Compute aggregate performance metrics
  const totalSent = deliveriesList.length;
  const deliveredCount = deliveriesList.filter(
    (d) => d.status === "delivered" || d.status === "opened" || d.status === "clicked"
  ).length;
  const openedCount = deliveriesList.filter(
    (d) => d.status === "opened" || d.status === "clicked" || d.openedAt
  ).length;
  const clickedCount = deliveriesList.filter((d) => d.status === "clicked" || d.clickedAt).length;
  
  // Format aggregate rates
  const deliveryRate = totalSent > 0 ? ((deliveredCount / totalSent) * 100).toFixed(1) : "0.0";
  const openRate = totalSent > 0 ? ((openedCount / totalSent) * 100).toFixed(1) : "0.0";
  const clickRate = totalSent > 0 ? ((clickedCount / totalSent) * 100).toFixed(1) : "0.0";

  // Server action delete handler
  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (id) {
      await deleteCampaignAction(id);
    }
  }

  return (
    <div className="space-y-8 py-8 max-w-6xl mx-auto px-4 font-sans text-foreground">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-serif text-foreground">Marketing Automation</h1>
          <p className="text-sm text-muted-foreground mt-1">Design target campaigns, trigger retention runs, and review metrics.</p>
        </div>
        <Link
          href="/admin/marketing/new"
          className="bg-primary text-primary-foreground hover:bg-primary/95 px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-primary/20 hover:scale-[1.01]"
        >
          <Plus size={16} /> Campaign Creator Wizard
        </Link>
      </div>

      {/* Aggregate Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Emails Sent", val: totalSent, sub: "All time dispatches" },
          { label: "Delivery Success Rate", val: `${deliveryRate}%`, sub: `${deliveredCount} successful deliveries` },
          { label: "Open Interaction Rate", val: `${openRate}%`, sub: `${openedCount} unique email opens` },
          { label: "Click Through Rate (CTR)", val: `${clickRate}%`, sub: `${clickedCount} CTA link clicks` }
        ].map((stat, idx) => (
          <div key={idx} className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-36">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            <div>
              <span className="text-3xl font-bold tracking-tight block mt-1">{stat.val}</span>
              <span className="text-[11px] text-muted-foreground mt-1 block">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Active Campaigns & History Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Campaigns List (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border/40 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border/30 flex justify-between items-center bg-secondary/10">
              <h3 className="font-bold text-base font-serif flex items-center gap-2">
                <Mail size={18} className="text-primary" /> Active Marketing Campaigns
              </h3>
              <span className="text-[11px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">
                {campaignsList.length} Total
              </span>
            </div>

            {campaignsList.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <FileText size={48} className="stroke-[1] text-muted-foreground/60" />
                <p className="text-sm font-medium">No marketing campaigns created yet.</p>
                <Link
                  href="/admin/marketing/new"
                  className="text-primary text-xs font-bold hover:underline"
                >
                  Create your first campaign &rarr;
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {campaignsList.map((campaign) => (
                  <div key={campaign.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-secondary/10 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/admin/marketing/${campaign.id}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          {campaign.name}
                        </Link>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          campaign.status === "completed" || campaign.status === "sent"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : campaign.status === "sending"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                            : campaign.status === "scheduled"
                            ? "bg-sky-500/10 border-sky-500/20 text-sky-500"
                            : "bg-secondary text-muted-foreground border-border/50"
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium truncate max-w-md">
                        Subject: {campaign.subject}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-semibold pt-1">
                        <span className="capitalize">Type: {campaign.campaignType.replace("_", " ")}</span>
                        <span>Audience: {campaign.segmentType.replace("_", " ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/marketing/${campaign.id}`}
                        className="border border-border/60 hover:bg-secondary/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                      >
                        Details
                      </Link>
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={campaign.id} />
                        <button
                          type="submit"
                          className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 rounded-xl border border-transparent hover:border-rose-500/10 transition-all"
                          title="Delete Campaign"
                        >
                          <Trash2 size={15} />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Runs Log History */}
        <div className="space-y-6">
          <div className="bg-card border border-border/40 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border/30 bg-secondary/10">
              <h3 className="font-bold text-base font-serif flex items-center gap-2">
                <BarChart3 size={18} className="text-primary" /> Recent Runs History
              </h3>
            </div>

            {runsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground leading-relaxed">
                No active runs processed yet. Runs are created when scheduled campaigns execute.
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {runsList.map((run) => (
                  <div key={run.id} className="p-5 space-y-2 hover:bg-secondary/10 transition-all">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-mono text-muted-foreground">{run.id}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        run.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : run.status === "failed"
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {run.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Recipients:</span>
                      <span className="text-foreground">{run.recipientsCount}</span>
                    </div>

                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Sent: {run.sentCount} &bull; Fail: {run.failedCount}</span>
                      <span>{new Date(run.startedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
