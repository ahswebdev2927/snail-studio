"use client";

import React, { useState, useEffect } from "react";
import { MapPin, CreditCard, Sliders, AlertCircle, X, RefreshCw, CheckCircle2 } from "lucide-react";
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
}: CustomerOrderActionsProps) {
  // Settings & validation state
  const [settings, setSettings] = useState<any>(null);
  const [isEditable, setIsEditable] = useState(false);

  // Address edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [name, setName] = useState(shippingAddress?.name || "");
  const [phone, setPhone] = useState(shippingAddress?.phone || "");
  const [addressLine1, setAddressLine1] = useState(shippingAddress?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(shippingAddress?.addressLine2 || "");
  const [city, setCity] = useState(shippingAddress?.city || "");
  const [state, setState] = useState(shippingAddress?.state || "");
  const [postalCode, setPostalCode] = useState(shippingAddress?.postalCode || "");
  const [country, setCountry] = useState(shippingAddress?.country || "");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Payment states
  const [isPaying, setIsPaying] = useState(false);

  // Fetch policy settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Determine if editing is allowed based on cutoff status policy and active shipment
  useEffect(() => {
    if (hasActiveShipment) {
      setIsEditable(false);
      return;
    }

    if (!settings) {
      setIsEditable(false);
      return;
    }

    const cutoff = settings.customerAddressEditUntil || "processing";
    if (cutoff === "never") {
      setIsEditable(false);
      return;
    }

    const statusHierarchy: Record<string, number> = {
      pending: 0,
      paid: 1,
      confirmed: 2,
      processing: 3,
      shipped: 4,
      delivered: 5,
      cancelled: 6,
    };

    const currentIdx = statusHierarchy[orderStatus.toLowerCase()] ?? 99;
    const cutoffIdx = statusHierarchy[cutoff.toLowerCase()] ?? 3;

    // Allowed if current status is less than or equal to cutoff status hierarchy
    setIsEditable(currentIdx <= cutoffIdx);

  }, [settings, orderStatus, hasActiveShipment]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddress) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          addressLine1,
          addressLine2: addressLine2 || null,
          city,
          state,
          postalCode,
          country,
          reason: reason || null,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        setReason("");
        // Reload page to display new address & calculated shipping fees
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`Failed to save address: ${err.error || "Server error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayDifference = async () => {
    setIsPaying(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay-difference`);
      const data = await res.json();

      if (res.ok && data.gatewaySessionUrl) {
        // Redirect to Razorpay payment session
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
    <div className="space-y-4">
      {/* Recalculation details for lower/higher shipping */}
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

      {/* Edit Address trigger button */}
      {isEditable && shippingAddress && (
        <button
          type="button"
          onClick={() => setShowEditModal(true)}
          className="w-full py-2.5 bg-secondary text-secondary-foreground hover:bg-muted border border-border/50 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <MapPin className="w-4 h-4 text-primary" />
          Edit Shipping Address
        </button>
      )}

      {/* Edit Address Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border shadow-2xl p-6 rounded-3xl w-full max-w-md text-foreground space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-border/40">
              <h3 className="font-serif text-base font-normal text-foreground">Edit Shipping Address</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recipient Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address Line 1</label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">State</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pincode</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Country</label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason for Edit (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Changed flat number"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  {isSaving ? "Saving..." : "Save Address"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center border border-border"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
