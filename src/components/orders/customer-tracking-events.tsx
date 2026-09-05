"use client";

import React, { useState } from "react";
import { Building2, Copy, Check, ExternalLink, MapPin, Calendar, Truck, Package } from "lucide-react";
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
}

export function CustomerTrackingEvents({
  carrier,
  provider = "delhivery",
  trackingNumber,
  trackingUrl,
  estimatedDeliveryAt,
  events = [],
  className,
}: CustomerTrackingEventsProps) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className={cn("bg-card border border-border/30 rounded-3xl p-6 shadow-sm space-y-6 font-sans", className)}>
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

      {/* Vertical Scan Events Log */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shipment History & Scan Events</h4>

        {events && events.length > 0 ? (
          <div className="space-y-5 pl-4 border-l border-border/40 ml-2">
            {events.map((evt) => (
              <div key={evt.id} className="relative space-y-1">
                {/* Visual Dot */}
                <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border border-card" />

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold uppercase text-foreground bg-secondary/50 px-2 py-0.5 border border-border/40 rounded-[6px] text-[9px] tracking-wide">
                    {evt.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-light">{formatDate(evt.timestamp)}</span>
                  {evt.location && (
                    <span className="text-[9px] text-muted-foreground/80 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary/80" />
                      {evt.location}
                    </span>
                  )}
                </div>

                {evt.description && (
                  <p className="text-xs font-light text-muted-foreground italic leading-relaxed pl-0.5">{evt.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 border border-dashed border-border/30 rounded-2xl text-center text-xs text-muted-foreground font-light flex items-center justify-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground/60" />
            <span>Shipment record created. Awaiting courier scan events...</span>
          </div>
        )}
      </div>
    </div>
  );
}
