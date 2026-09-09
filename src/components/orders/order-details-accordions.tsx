"use client";

import React, { useState } from "react";
import { Truck, Activity, ChevronDown, ChevronUp, Package } from "lucide-react";
import { CustomerTrackingEvents, TrackingEventItem } from "@/components/orders/customer-tracking-events";
import { cn } from "@/lib/utils";

interface ShipmentData {
  carrier: string;
  provider: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  estimatedDeliveryAt?: string | Date | null;
  events?: TrackingEventItem[];
}

interface ShipmentUpdatesAccordionProps {
  shipment?: ShipmentData | null;
  defaultOpen?: boolean;
}

export function ShipmentUpdatesAccordion({
  shipment,
  defaultOpen = false,
}: ShipmentUpdatesAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-card border border-border/30 rounded-2xl shadow-sm overflow-hidden transition-all font-sans">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-secondary/10 transition-colors cursor-pointer border-none bg-transparent"
      >
        <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary shrink-0" />
          Shipment Updates
        </h3>
        <div className="p-1 rounded-full text-muted-foreground hover:text-foreground">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-5 pt-0 border-t border-border/15">
          {shipment ? (
            <div className="pt-4">
              <CustomerTrackingEvents
                carrier={shipment.carrier}
                provider={shipment.provider}
                trackingNumber={shipment.trackingNumber}
                trackingUrl={shipment.trackingUrl}
                estimatedDeliveryAt={shipment.estimatedDeliveryAt}
                events={shipment.events || []}
                isNested={true}
              />
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground font-light flex flex-col items-center gap-2">
              <Package className="w-6 h-6 text-muted-foreground/50 animate-pulse" />
              <span>Handcrafting in progress. Tracking details will update once shipped.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StatusHistoryItem {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string | Date;
}

interface OrderUpdatesAccordionProps {
  statusHistory: StatusHistoryItem[];
  defaultOpen?: boolean;
}

export function OrderUpdatesAccordion({
  statusHistory = [],
  defaultOpen = false,
}: OrderUpdatesAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-card border border-border/30 rounded-2xl shadow-sm overflow-hidden transition-all font-sans">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-secondary/10 transition-colors cursor-pointer border-none bg-transparent"
      >
        <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary shrink-0" />
          Order Updates
        </h3>
        <div className="p-1 rounded-full text-muted-foreground hover:text-foreground">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-5 pt-0 border-t border-border/15">
          {statusHistory && statusHistory.length > 0 ? (
            <div className="space-y-4 pl-2 border-l border-border/30 ml-1 pt-4">
              {statusHistory.map((history) => (
                <div key={history.id} className="relative pl-3.5 text-xs">
                  {/* Event Dot */}
                  <div className="absolute -left-[12.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-accent border border-background" />

                  <p className="font-semibold text-foreground capitalize flex items-center gap-1.5">
                    {history.status.replace(/_/g, " ")}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-mono">
                    {new Date(history.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {history.notes && (
                    <p className="text-[10px] text-muted-foreground font-light leading-relaxed mt-1 bg-secondary/15 rounded-lg p-2 border border-border/10">
                      {history.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-light pt-3">No order updates recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}
