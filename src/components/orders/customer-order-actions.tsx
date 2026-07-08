"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin, CreditCard, Sliders, AlertCircle, X, RefreshCw, CheckCircle2, Pencil, Phone } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface CustomerOrderActionsProps {
  orderId: string;
  shippingAddress: {
    id: string;
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  shippingAmountPaid: number;
  currentShippingCharge: number;
  shippingDifference: number;
  shippingDifferenceStatus: string;
  orderStatus: string;
  hasActiveShipment: boolean;
  storePhone: string;
}

export default function CustomerOrderActions({
  orderId,
  shippingAddress,
  shippingAmountPaid,
  currentShippingCharge,
  shippingDifference,
  shippingDifferenceStatus,
  orderStatus,
  hasActiveShipment,
  storePhone,
}: CustomerOrderActionsProps) {
  // Modal states
  const [mounted, setMounted] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePayDifference = async () => {
    setIsPaying(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay-difference`);
      const data = await res.json();

      if (res.ok && data.gatewaySessionUrl) {
        window.location.href = data.gatewaySessionUrl;
      } else {
        alert(data.error || "Failed to initialize payment gateway session.");
      }
    } catch (error) {
      console.error("Error pay-difference:", error);
      alert("An unexpected network error occurred.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Delivery Address Card (with Edit Support trigger) */}
      <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-border/20">
          <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            Delivery Address
          </h3>
          {shippingAddress && (
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="p-1.5 rounded-lg hover:bg-secondary/40 text-rose-500 hover:text-rose-600 transition-all cursor-pointer"
              title="Edit Address"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {shippingAddress ? (
          <div className="text-xs font-light leading-relaxed space-y-1">
            <p className="font-semibold text-foreground">{shippingAddress.name}</p>
            <p className="text-muted-foreground">{shippingAddress.addressLine1}</p>
            {shippingAddress.addressLine2 && <p className="text-muted-foreground">{shippingAddress.addressLine2}</p>}
            <p className="text-muted-foreground">{shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postalCode}</p>
            <p className="text-muted-foreground">{shippingAddress.country}</p>
            <p className="text-[10px] text-muted-foreground pt-1 font-medium">Contact: {shippingAddress.phone}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-light">No address attached to this order record.</p>
        )}
      </div>

      {/* 2. Recalculation details for lower/higher shipping */}
      {shippingDifference !== 0 && (
        <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Shipping Adjustment Summary
          </h4>
          <div className="text-xs space-y-1.5 font-light text-foreground">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Shipping Paid:</span>
              <span>{formatPrice(shippingAmountPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recalculated Rate:</span>
              <span>{formatPrice(currentShippingCharge)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border/20 pt-1.5">
              <span className="text-muted-foreground">Difference:</span>
              <span className={shippingDifference > 0 ? "text-amber-500" : "text-emerald-500"}>
                {shippingDifference > 0 ? "+" : ""}{formatPrice(shippingDifference)}
              </span>
            </div>
          </div>

          <div className="bg-secondary/15 border border-border/10 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex justify-between text-[10px] items-center">
              <span className="text-muted-foreground uppercase font-bold tracking-wider">Adjustment Status:</span>
              <span className="uppercase font-bold text-primary">{shippingDifferenceStatus}</span>
            </div>

            {shippingDifferenceStatus === "pending" && (
              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Recalculation shows an outstanding balance of <span className="font-semibold text-foreground">{formatPrice(shippingDifference)}</span> due to shipping rate adjustments. Please pay this difference to resume fulfillment.
                </p>
                <button
                  type="button"
                  disabled={isPaying}
                  onClick={handlePayDifference}
                  className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isPaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {isPaying ? "Processing..." : "Pay Shipping Difference"}
                </button>
              </div>
            )}

            {shippingDifferenceStatus === "paid" && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-normal flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Shipping difference paid successfully. Order processing resumed.
              </p>
            )}

            {shippingDifferenceStatus === "waived" && (
              <p className="text-[10px] text-muted-foreground leading-normal">
                Outstanding difference absorbed/waived by the store. No payment is required.
              </p>
            )}

            {shippingDifferenceStatus === "refunded" && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-normal flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Recalculated rate is lower. A refund of {formatPrice(Math.abs(shippingDifference))} has been credited back to your payment source.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. Contact Support Alert Modal */}
      {showSupportModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-card border border-border shadow-2xl p-6 rounded-3xl w-full max-w-sm text-foreground space-y-5 my-auto relative">
            <div className="flex justify-between items-center pb-3 border-b border-border/40">
              <h3 className="font-serif text-base font-normal text-foreground">Edit Shipping Address</h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="p-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-light leading-relaxed">
              <p className="text-foreground">
                To request any corrections or modifications to your shipping details, please contact our support team.
              </p>
              
              <div className="bg-secondary/15 border border-border/20 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Customer Support</span>
                <a 
                  href={`tel:${storePhone}`}
                  className="text-base font-serif font-normal text-primary hover:underline block flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  {storePhone}
                </a>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-normal font-light">
                  Please request changes as soon as possible before the order is shipped to avoid courier routing errors, delivery delays, or return shipments.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-border/40">
              <a
                href={`tel:${storePhone}`}
                className="flex-1 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                Call Support
              </a>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="flex-1 py-2 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold text-center border border-border transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
