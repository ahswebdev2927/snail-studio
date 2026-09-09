"use client";

import React, { useState } from "react";
import { Building2, Copy, Check, ExternalLink, MapPin, Calendar, Package, ChevronDown, ChevronUp } from "lucide-react";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

export interface TrackingEventItem {
  id: string;
  status: string;
  location?: string | null;
  description?: string | null;
  timestamp: string | Date;
}

export interface CustomerTrackingEventsProps {
  carrier: string;
  provider?: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  estimatedDeliveryAt?: string | Date | null;
  events?: TrackingEventItem[];
  className?: string;
  isNested?: boolean;
}

export function CustomerTrackingEvents({
  carrier,
  provider = "delhivery",
  trackingNumber,
  trackingUrl,
  estimatedDeliveryAt,
  events = [],
  className,
  isNested = false,
}: CustomerTrackingEventsProps) {
  const [copied, setCopied] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const handleCopyWaybill = () => {
    if (trackingNumber) {
      navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      notify.success("Tracking number copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateVal: string | Date) => {
    return new Date(dateVal).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatEstDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return "Pending Dispatch";
    return new Date(dateVal).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Extract and order milestone status summaries (chronological EARLIEST -> LATEST)
  const getMilestoneSummary = (rawEvents: TrackingEventItem[]) => {
    // Sort raw events by timestamp ascending (earliest to latest)
    const sorted = [...rawEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const categories = [
      {
        key: "picked_up",
        label: "Picked Up",
        matches: ["picked_up", "pickup_completed", "manifested"],
      },
      {
        key: "in_transit",
        label: "In Transit",
        matches: ["in_transit", "reached_destination_hub", "dispatched", "in transit"],
      },
      {
        key: "pending",
        label: "Pending",
        matches: ["pending", "ndr", "exception", "delayed", "attempt_failed"],
      },
      {
        key: "out_for_delivery",
        label: "Out for Delivery",
        matches: ["out_for_delivery", "out for delivery"],
      },
      {
        key: "delivered",
        label: "Delivered",
        matches: ["delivered"],
      },
      {
        key: "rto",
        label: "Return to Origin (RTO)",
        matches: ["rto", "rto_initiated", "rto_in_transit", "returned_to_origin"],
      },
    ];

    const milestones: { label: string; location?: string | null; timestamp: string | Date; description?: string | null }[] = [];

    for (const cat of categories) {
      // Find the latest scan event for this specific category stage
      const matchingEvents = sorted.filter((e) => {
        const st = (e.status || "").toLowerCase().replace(/\s+/g, "_");
        return cat.matches.some((m) => st.includes(m));
      });

      if (matchingEvents.length > 0) {
        const latestMatch = matchingEvents[matchingEvents.length - 1];
        milestones.push({
          label: cat.label,
          location: latestMatch.location,
          timestamp: latestMatch.timestamp,
          description: latestMatch.description,
        });
      }
    }

    // Fallback if events exist but don't match predefined category names
    if (milestones.length === 0 && sorted.length > 0) {
      const seenStatuses = new Set<string>();
      for (const e of sorted) {
        const normStatus = (e.status || "").toLowerCase();
        if (!seenStatuses.has(normStatus)) {
          seenStatuses.add(normStatus);
          milestones.push({
            label: e.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            location: e.location,
            timestamp: e.timestamp,
            description: e.description,
          });
        }
      }
    }

    return milestones;
  };

  const milestoneSummaries = getMilestoneSummary(events);

  return (
    <div
      className={cn(
        isNested
          ? "space-y-6 font-sans w-full"
          : "bg-card border border-border/30 rounded-3xl p-6 shadow-sm space-y-6 font-sans",
        className
      )}
    >
      {/* Carrier Header Card */}
      <div className="space-y-4 p-4 bg-secondary/15 rounded-2xl border border-border/20 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Courier Partner</p>
              {provider === "external" && (
                <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">
                  External Courier
                </span>
              )}
            </div>
            <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              {carrier}
            </p>
          </div>

          {/* 1-Tap Copy Waybill */}
          <div className="space-y-1 text-right">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Waybill / Tracking #</p>
            <div className="flex items-center justify-end gap-1.5">
              <span className="font-mono font-bold text-primary text-sm tracking-wider">{trackingNumber}</span>
              <button
                type="button"
                onClick={handleCopyWaybill}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors cursor-pointer bg-transparent border-none"
                title="Copy tracking number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Estimated Delivery Date Banner */}
        <div className="pt-3 border-t border-border/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Estimated Delivery:</span>
            <span className="font-semibold text-foreground font-serif">{formatEstDate(estimatedDeliveryAt)}</span>
          </div>

          {/* Direct External Link Portal Button */}
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <span>Track on {carrier} Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Complete Scan Details Vertical Flow */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Complete Scan Details</h4>
          {events && events.length > 0 && (
            <button
              type="button"
              onClick={() => setShowFullHistory(!showFullHistory)}
              className="text-[10px] text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              {showFullHistory ? "Hide Raw Logs" : "All Courier Logs"}
              {showFullHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {milestoneSummaries && milestoneSummaries.length > 0 ? (
          <div className="space-y-2 py-1">
            {milestoneSummaries.map((m, idx) => {
              const isLast = idx === milestoneSummaries.length - 1;
              return (
                <div key={idx} className="relative flex items-start gap-3.5">
                  {/* Vertical Line Connector with Dot and Arrow */}
                  <div className="flex flex-col items-center shrink-0 mt-1">
                    <div className="w-4 h-4 rounded-full bg-primary/15 border-2 border-primary flex items-center justify-center z-10 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    {!isLast && (
                      <div className="flex flex-col items-center my-1">
                        <div className="w-[2px] h-9 bg-primary/30" />
                        <ChevronDown className="w-3 h-3 text-primary/60 -mt-1" />
                      </div>
                    )}
                  </div>

                  {/* Milestone Card Content */}
                  <div className="bg-secondary/15 border border-border/20 rounded-2xl p-3.5 flex-1 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-foreground text-xs uppercase tracking-wide">
                        {m.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono bg-background/50 px-2 py-0.5 rounded-md border border-border/20">
                        {formatDate(m.timestamp)}
                      </span>
                    </div>

                    {m.location && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground/90">Location: {m.location}</span>
                      </p>
                    )}

                    {m.description && (
                      <p className="text-[10px] text-muted-foreground/80 italic pt-0.5 pl-0.5">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 border border-dashed border-border/30 rounded-2xl text-center text-xs text-muted-foreground font-light flex items-center justify-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground/60" />
            <span>Shipment record created. Awaiting courier scan updates...</span>
          </div>
        )}

        {/* Optional Expandable Raw Courier Scan History */}
        {showFullHistory && events && events.length > 0 && (
          <div className="pt-4 border-t border-border/20 space-y-3">
            <h5 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">Raw Courier Scan Logs</h5>
            <div className="space-y-3 pl-3 border-l border-border/30 ml-1 text-xs">
              {events.map((evt) => (
                <div key={evt.id} className="relative space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground/80 capitalize">{evt.status.replace(/_/g, " ")}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">{formatDate(evt.timestamp)}</span>
                  </div>
                  {evt.location && <p className="text-[10px] text-muted-foreground">Location: {evt.location}</p>}
                  {evt.description && <p className="text-[10px] text-muted-foreground/80 italic">{evt.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

