"use client";

import React from "react";
import { Package, ShieldCheck, Clock, Truck, Home, AlertCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomerTrackingTimelineProps {
  orderStatus: string;
  shipmentStatus?: string | null;
  className?: string;
}

export function CustomerTrackingTimeline({
  orderStatus,
  shipmentStatus = "",
  className,
}: CustomerTrackingTimelineProps) {
  const statusLower = (orderStatus || "").toLowerCase();
  const shipStatusLower = (shipmentStatus || "").toLowerCase();

  const isCancelled = statusLower === "cancelled";
  const isRefunded = statusLower === "refunded";
  const isReturned = statusLower === "returned";
  const isNDR = shipStatusLower === "ndr";
  const isRTO = shipStatusLower === "rto";

  if (isReturned) {
    return (
      <div className={cn("p-4.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-xs", className)}>
        <RotateCcw className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold uppercase tracking-wider text-[10px]">Order Returned</p>
          <p className="font-light">This order has been returned and verified. The return refund has been processed.</p>
        </div>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className={cn("p-4.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-xs", className)}>
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold uppercase tracking-wider text-[10px]">Order Cancelled</p>
          <p className="font-light">This order has been cancelled and will not be processed further. If you were charged, a refund is being processed.</p>
        </div>
      </div>
    );
  }

  if (isRefunded) {
    return (
      <div className={cn("p-4.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-xs", className)}>
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold uppercase tracking-wider text-[10px]">Order Refunded</p>
          <p className="font-light">A refund has been credited back to your original source of payment.</p>
        </div>
      </div>
    );
  }

  // Determine stage completion flags
  const isPlacedDone = true;
  const isPaidDone = statusLower !== "pending";
  const isProcessingDone = ["processing", "ready_to_ship", "shipped", "delivered"].includes(statusLower) || !!shipmentStatus;
  const isReadyToShipDone = ["ready_to_ship", "shipped", "delivered"].includes(statusLower) || !!shipmentStatus;
  const isShippedDone =
    ["shipped", "delivered"].includes(statusLower) ||
    ["picked_up", "pickup_completed", "in_transit", "reached_destination_hub", "out_for_delivery", "delivered"].includes(shipStatusLower);
  const isOutForDeliveryDone = ["out_for_delivery", "delivered"].includes(shipStatusLower);
  const isDeliveredDone = statusLower === "delivered" || shipStatusLower === "delivered";

  const timelineSteps = [
    { label: "Placed", done: isPlacedDone, icon: Package },
    { label: "Confirmed", done: isPaidDone, icon: ShieldCheck },
    { label: "Processing", done: isProcessingDone, icon: Clock },
    { label: "Ready to Ship", done: isReadyToShipDone, icon: Package },
    { label: "In Transit", done: isShippedDone, icon: Truck },
    { label: "Out for Delivery", done: isOutForDeliveryDone, icon: Truck },
    { label: "Delivered", done: isDeliveredDone, icon: Home },
  ];

  // Find the current active (highest completed) milestone stage
  const currentActiveStep = [...timelineSteps].reverse().find((s) => s.done) || timelineSteps[0];

  return (
    <div className={cn("space-y-4 font-sans", className)}>
      {/* NDR Exception Warning */}
      {isNDR && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 rounded-2xl flex items-center gap-3 text-xs font-light">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[10px]">Delivery Exception (NDR)</p>
            <p>A delivery attempt was unsuccessful by the courier partner. Re-attempt will be scheduled automatically.</p>
          </div>
        </div>
      )}

      {/* RTO Warning */}
      {isRTO && (
        <div className="p-4 bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 rounded-2xl flex items-center gap-3 text-xs font-light">
          <RotateCcw className="w-5 h-5 text-purple-500 shrink-0" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[10px]">Return to Origin (RTO)</p>
            <p>The package is being returned back to the studio warehouse. Please contact support for re-dispatch assistance.</p>
          </div>
        </div>
      )}

      {/* Visual Step Bar */}
      <div className="bg-card border border-border/30 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="w-full">
          <div 
            className="grid text-center text-xs relative w-full" 
            style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
          >
            {/* Horizontal Connecting Line */}
            <div className="absolute top-3.5 sm:top-4 left-[6%] right-[6%] h-[2px] bg-border/30 z-0" />
            
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    "w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all text-[10px] sm:text-[11px]",
                    step.done
                      ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "bg-background border-border/50 text-muted-foreground"
                  )}
                >
                  <step.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                {/* Labels shown on desktop / medium screens only */}
                <span
                  className={cn(
                    "hidden md:block text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-2.5 text-center leading-tight max-w-[85px] mx-auto",
                    step.done ? "text-primary font-semibold" : "text-muted-foreground/60"
                  )}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* On small devices (< md), display only the current active status label centered below */}
          <div className="md:hidden mt-3.5 pt-2.5 border-t border-border/15 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider">
              Status: {currentActiveStep.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
