"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin, CreditCard, Sliders, AlertCircle, X, RefreshCw, CheckCircle2, Lock, Phone, ShieldAlert } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // Dynamically load Razorpay SDK checkout script if not present
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePayDifference = async () => {
    setIsPaying(true);
    setPaymentError(null);

    try {
      // 1. Fetch payment session / Razorpay checkout details
      const res = await fetch(`/api/orders/${orderId}/pay-difference`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.paymentSession) {
        throw new Error(data.error || "Failed to initialize shipping difference payment session.");
      }

      const { paymentSession } = data;

      // 2. Open Razorpay modal or redirect if external checkout URL
      if (paymentSession.checkoutUrl) {
        window.location.href = paymentSession.checkoutUrl;
        return;
      }

      if ((window as any).Razorpay && paymentSession.keyId) {
        const options = {
          key: paymentSession.keyId,
          amount: paymentSession.amount,
          currency: paymentSession.currency || "INR",
          name: "Snail Studio",
          description: `Shipping rate adjustment for Order #${orderId}`,
          order_id: paymentSession.gatewayOrderId || paymentSession.id,
          handler: async function (response: any) {
            setIsPaying(true);
            try {
              const confirmRes = await fetch(`/api/orders/${orderId}/pay-difference`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  paymentId: response.razorpay_payment_id,
                  gatewayOrderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                }),
              });

              const confirmData = await confirmRes.json();
              if (confirmRes.ok && confirmData.success) {
                window.location.reload();
              } else {
                setPaymentError(confirmData.error || "Payment verification failed. Please contact support.");
                setIsPaying(false);
              }
            } catch (err: any) {
              console.error(err);
              setPaymentError("An error occurred during payment verification.");
              setIsPaying(false);
            }
          },
          prefill: {
            name: shippingAddress?.name || "",
            contact: shippingAddress?.phone || "",
          },
          theme: {
            color: "#AC5429",
          },
          modal: {
            ondismiss: function () {
              setIsPaying(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else if (paymentSession.paymentUrl) {
        window.location.href = paymentSession.paymentUrl;
      } else {
        throw new Error("Razorpay gateway client unavailable. Please refresh and try again.");
      }
    } catch (error: any) {
      console.error("Pay difference error:", error);
      setPaymentError(error.message || "An unexpected error occurred.");
      setIsPaying(false);
    }
  };

  const isTerminalStatus = ["shipped", "delivered", "cancelled", "refunded"].includes(orderStatus.toLowerCase());
  const isAddressLocked = hasActiveShipment || isTerminalStatus;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Delivery Address Card with Lock Indicator */}
      <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between pb-2.5 border-b border-border/20">
          <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            Delivery Address
          </h3>

          {/* Address Lock Status Badge */}
          {isAddressLocked ? (
            <span 
              className="inline-flex items-center justify-center p-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              title="Address Locked"
              aria-label="Address Locked"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="inline-flex items-center justify-center p-1.5 rounded-full bg-secondary/40 text-secondary-foreground border border-border/30 hover:bg-secondary transition-all cursor-pointer"
              title="Request Edit"
              aria-label="Request Edit"
            >
              <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
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
          <p className="text-xs text-muted-foreground font-light">No delivery address attached to this order.</p>
        )}

        {/* Informative footer note on address lock policy */}
        <div className="pt-2 border-t border-border/15 text-[10px] text-muted-foreground font-light flex items-center justify-between">
          {isAddressLocked ? (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Lock className="w-3 h-3 shrink-0" />
              Locked: Shipment created or order dispatched.
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0 text-primary" />
              Address changes must be requested prior to shipment creation.
            </span>
          )}
          
          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            className="text-primary hover:underline text-[10px] font-medium cursor-pointer"
          >
            Help
          </button>
        </div>
      </div>

      {/* 2. Shipping Adjustment & Payment Channel Card */}
      {(shippingDifference !== 0 || shippingDifferenceStatus !== "none") && (
        <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-border/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              Shipping Adjustment Summary
            </h4>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-secondary text-primary">
              {shippingDifferenceStatus}
            </span>
          </div>

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
              <span className="text-muted-foreground">Rate Difference:</span>
              <span className={shippingDifference > 0 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>
                {shippingDifference > 0 ? "+" : ""}{formatPrice(shippingDifference)}
              </span>
            </div>
          </div>

          <div className="bg-secondary/15 border border-border/20 rounded-xl p-3.5 space-y-2 text-xs">
            {shippingDifferenceStatus === "pending" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    Recalculation requires an outstanding balance of <span className="font-bold text-foreground">{formatPrice(shippingDifference)}</span> due to shipping rate adjustments. Please settle this amount to resume order fulfillment.
                  </p>
                </div>

                {paymentError && (
                  <p className="text-[10px] text-destructive font-medium bg-destructive/10 p-2 rounded-lg">
                    {paymentError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={isPaying}
                  onClick={handlePayDifference}
                  className="w-full py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isPaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {isPaying ? "Initializing Gateway..." : `Pay Shipping Difference (${formatPrice(shippingDifference)})`}
                </button>
              </div>
            )}

            {shippingDifferenceStatus === "paid" && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <span className="font-semibold">Adjustment Paid:</span> Shipping difference of {formatPrice(shippingDifference)} paid successfully. Order fulfillment is active.
                </p>
              </div>
            )}

            {shippingDifferenceStatus === "waived" && (
              <div className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  <span className="font-semibold text-foreground">Waived under Absorb Policy:</span> Rate difference covered under store absorb policy. No payment required.
                </p>
              </div>
            )}

            {shippingDifferenceStatus === "refunded" && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <span className="font-semibold">Refund Credited:</span> Recalculated rate is lower. A refund of {formatPrice(Math.abs(shippingDifference))} has been credited to your payment source.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Support & Address Request Modal */}
      {showSupportModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border shadow-2xl p-6 rounded-3xl w-full max-w-sm text-foreground space-y-5 my-auto relative">
            <div className="flex justify-between items-center pb-3 border-b border-border/40">
              <h3 className="font-serif text-base font-semibold text-foreground">Delivery Address Assistance</h3>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-light leading-relaxed">
              {isAddressLocked ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-2xl flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div className="space-y-1">
                    <p className="font-semibold text-xs">Address Locked</p>
                    <p className="text-[10px] leading-normal font-light">
                      A shipment (AWB) has already been created or dispatched for this order. Direct address changes are locked to prevent courier routing failures.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-foreground">
                  Address modifications prior to shipment creation must be reviewed and processed by our store administrators.
                </p>
              )}
              
              <div className="bg-secondary/20 border border-border/20 rounded-2xl p-4 text-center space-y-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Support Helpline</span>
                <a 
                  href={`tel:${storePhone}`}
                  className="text-base font-serif font-semibold text-primary hover:underline block flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  {storePhone}
                </a>
              </div>

              <div className="p-3 bg-secondary/15 border border-border/20 text-muted-foreground rounded-xl flex items-start gap-2.5 text-[10px] leading-normal font-light">
                <AlertCircle className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                <p>
                  Please reach out to support promptly before parcel dispatch. If rate adjustments exceed absorb thresholds, a Razorpay payment link will be shared or displayed on this order page.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-border/40">
              <a
                href={`tel:${storePhone}`}
                className="flex-1 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                Call Support
              </a>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="flex-1 py-2.5 bg-transparent hover:bg-secondary text-foreground rounded-xl text-xs font-semibold text-center border border-border transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
