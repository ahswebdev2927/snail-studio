"use client";

import React, { useTransition, useState } from "react";
import { sendCampaignNowAction } from "@/features/marketing/actions";
import { Mail, Calendar, FileText, Play, CheckCircle, BarChart3, AlertTriangle, ArrowLeft, RefreshCw, Clock } from "lucide-react";
import Link from "next/link";

interface CampaignItem {
  id: string;
  name: string;
  subject: string;
  campaignType: string;
  segmentType: string;
  templateName: string;
  bodyHtml: string;
  status: string;
  scheduledAt: Date | null;
  createdAt: Date;
}

interface RunItem {
  id: string;
  status: string;
  recipientsCount: number;
  sentCount: number;
  failedCount: number;
  revenue: number;
  ctr: number;
  startedAt: Date;
  completedAt: Date | null;
}

interface SnapshotItem {
  id: string;
  email: string;
  status: string;
  retryCount: number;
  nextRetryAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

interface DeliveryItem {
  id: string;
  email: string;
  status: string;
  openedAt: Date | null;
  clickedAt: Date | null;
  bouncedAt: Date | null;
  sentAt: Date;
}

interface CampaignDetailClientProps {
  campaign: CampaignItem;
  runs: RunItem[];
  snapshots: SnapshotItem[];
  deliveries: DeliveryItem[];
}

export default function CampaignDetailClient({ campaign, runs, snapshots, deliveries }: CampaignDetailClientProps) {
  const [isPending, startTransition] = useTransition();
  const [triggerError, setTriggerError] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"deliveries" | "runs" | "snapshots">("deliveries");

  // Compute stats
  const totalRecipients = deliveries.length;
  const delivered = deliveries.filter(d => d.status === "delivered" || d.status === "opened" || d.status === "clicked").length;
  const opened = deliveries.filter(d => d.status === "opened" || d.status === "clicked" || d.openedAt).length;
  const clicked = deliveries.filter(d => d.status === "clicked" || d.clickedAt).length;
  const bounced = deliveries.filter(d => d.status === "bounced" || d.bouncedAt).length;
  const failed = deliveries.filter(d => d.status === "failed").length;

  const openRate = totalRecipients > 0 ? ((opened / totalRecipients) * 100).toFixed(1) : "0.0";
  const clickRate = totalRecipients > 0 ? ((clicked / totalRecipients) * 100).toFixed(1) : "0.0";
  const deliveryRate = totalRecipients > 0 ? ((delivered / totalRecipients) * 100).toFixed(1) : "0.0";

  const handleTriggerSend = () => {
    setTriggerError("");
    startTransition(async () => {
      const res = await sendCampaignNowAction(campaign.id);
      if (res && !res.success) {
        setTriggerError(res.error || "Failed to trigger campaign run.");
      }
    });
  };

  return (
    <div className="space-y-6 font-sans text-foreground">
      
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link 
          href="/admin/marketing" 
          className="border border-border/60 hover:bg-secondary/20 p-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Campaign Details</span>
          <h2 className="text-xl font-bold font-serif">{campaign.name}</h2>
        </div>
      </div>

      {triggerError && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-4 text-sm font-semibold">
          ⚠️ {triggerError}
        </div>
      )}

      {/* Main Campaign Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Metadata & Actions (1 col) */}
        <div className="space-y-6">
          
          <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/30">Campaign Metadata</h3>
            
            <div className="space-y-1.5 text-sm font-medium">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs uppercase">ID:</span>
                <span className="font-mono text-xs">{campaign.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs uppercase">Subject:</span>
                <span className="text-right truncate max-w-[200px]">{campaign.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs uppercase">Archetype:</span>
                <span className="capitalize">{campaign.campaignType.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs uppercase">Target Segment:</span>
                <span className="capitalize">{campaign.segmentType.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs uppercase">Created:</span>
                <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-muted-foreground text-xs uppercase">Status:</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
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
            </div>

            {/* Campaign Send Actions */}
            {(campaign.status === "draft" || campaign.status === "failed") && (
              <div className="pt-4 border-t border-border/30">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleTriggerSend}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/95 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:scale-[1.01] transition-all"
                >
                  {isPending ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" /> Transmitting Batch...
                    </>
                  ) : (
                    <>
                      <Play size={15} /> Trigger Send Run Now
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
        </div>

        {/* Right Column: Analytics & Delivery Status Table (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats widgets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: "Total Reach", val: totalRecipients },
              { title: "Delivered %", val: `${deliveryRate}%`, sub: `${delivered} items` },
              { title: "Open Rate", val: `${openRate}%`, sub: `${opened} opens` },
              { title: "CTR", val: `${clickRate}%`, sub: `${clicked} clicks` }
            ].map((stat, idx) => (
              <div key={idx} className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{stat.title}</span>
                <span className="text-xl font-bold tracking-tight mt-1.5 block">{stat.val}</span>
                {stat.sub && <span className="text-[9px] text-muted-foreground mt-0.5 block">{stat.sub}</span>}
              </div>
            ))}
          </div>

          {/* Delivery logs panel tabs */}
          <div className="bg-card border border-border/40 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/30 bg-secondary/10 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveSubTab("deliveries")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === "deliveries" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Delivery Reports ({deliveries.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("runs")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === "runs" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Campaign Runs ({runs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("snapshots")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === "snapshots" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Queue Snapshots ({snapshots.length})
              </button>
            </div>

            {/* TAB SUB-CONTENT 1: Deliveries reports */}
            {activeSubTab === "deliveries" && (
              <div className="divide-y divide-border/20 max-h-96 overflow-y-auto">
                {deliveries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground leading-relaxed">
                    No recipient delivery reports registered for this campaign.
                  </div>
                ) : (
                  deliveries.map((dlv) => (
                    <div key={dlv.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-secondary/5 transition-all text-xs">
                      <div>
                        <span className="font-bold text-foreground block">{dlv.email}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          Sent: {new Date(dlv.sentAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 font-semibold text-muted-foreground text-[11px]">
                        <span>Opens: {dlv.openedAt ? "✅" : "❌"}</span>
                        <span>Clicks: {dlv.clickedAt ? "✅" : "❌"}</span>
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${
                          dlv.status === "delivered" || dlv.status === "opened" || dlv.status === "clicked"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : dlv.status === "bounced" || dlv.status === "complained" || dlv.status === "failed"
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                            : "bg-secondary text-muted-foreground border-border/50"
                        }`}>
                          {dlv.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB SUB-CONTENT 2: Runs Log history */}
            {activeSubTab === "runs" && (
              <div className="divide-y divide-border/20">
                {runs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No active runs completed for this campaign.
                  </div>
                ) : (
                  runs.map((run) => (
                    <div key={run.id} className="p-4 space-y-2 hover:bg-secondary/5 transition-all text-xs font-semibold">
                      <div className="flex justify-between">
                        <span className="font-mono text-muted-foreground">{run.id}</span>
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${
                          run.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 font-medium text-muted-foreground text-[11px]">
                        <span>Recipients: {run.recipientsCount}</span>
                        <span>Sent: {run.sentCount}</span>
                        <span>Failures: {run.failedCount}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground text-right">
                        Run time: {new Date(run.startedAt).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB SUB-CONTENT 3: Recipient Snapshots Queue & Retries */}
            {activeSubTab === "snapshots" && (
              <div className="divide-y divide-border/20 max-h-96 overflow-y-auto">
                {snapshots.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No recipient snapshots recorded.
                  </div>
                ) : (
                  snapshots.map((snap) => (
                    <div key={snap.id} className="p-4 space-y-2 hover:bg-secondary/5 transition-all text-xs">
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-foreground">{snap.email}</span>
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded ${
                          snap.status === "sent"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : snap.status === "failed"
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {snap.status}
                        </span>
                      </div>
                      
                      {snap.status === "failed" && (
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 text-[10px] font-medium text-rose-500 space-y-1">
                          <div><strong>Error Log:</strong> {snap.errorMessage || "Unknown dispatch failure"}</div>
                          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                            <Clock size={12} /> Retries: {snap.retryCount}/3
                            {snap.nextRetryAt && (
                              <span>&bull; Next Attempt: {new Date(snap.nextRetryAt).toLocaleTimeString()}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
        </div>

      </div>

    </div>
  );
}
