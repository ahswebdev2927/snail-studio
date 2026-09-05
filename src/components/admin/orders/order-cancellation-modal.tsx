"use client";

import React, { useState } from "react";
import { X, AlertTriangle, DollarSign, Loader2 } from "lucide-react";

interface OrderCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  totalAmountPaise: number;
  onSuccess: () => void;
}

export function OrderCancellationModal({
  isOpen,
  onClose,
  orderId,
  totalAmountPaise,
  onSuccess,
}: OrderCancellationModalProps) {
  const [reason, setReason] = useState("");
  const [refundType, setRefundType] = useState<"full" | "custom">("full");
  const [customRefundRupees, setCustomRefundRupees] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalRupees = totalAmountPaise / 100;

  // Calculate current refund amount in paise & percentage
  const calculateRefundPaise = (): number => {
    if (refundType === "full") {
      return totalAmountPaise;
    }
    const parsed = parseFloat(customRefundRupees);
    if (isNaN(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  };

  const currentRefundPaise = calculateRefundPaise();
  const currentRefundRupees = currentRefundPaise / 100;
  const refundPercentage = totalAmountPaise > 0 ? Math.min(100, Math.round((currentRefundPaise / totalAmountPaise) * 100)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      setErrorMsg("Please enter a valid cancellation reason (minimum 3 characters).");
      return;
    }

    if (refundType === "custom") {
      if (currentRefundPaise <= 0) {
        setErrorMsg("Please enter a valid custom refund amount greater than ₹0.");
        return;
      }
      if (currentRefundPaise > totalAmountPaise) {
        setErrorMsg(`Refund amount (₹${currentRefundRupees.toFixed(2)}) cannot exceed total order amount (₹${totalRupees.toFixed(2)}).`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: trimmedReason,
          refundType,
          refundAmountPaise: refundType === "custom" ? currentRefundPaise : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel order and process refund.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Order Cancellation error:", err);
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40 bg-secondary/10">
          <div className="flex items-center gap-2 text-rose-500">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-serif text-base font-semibold text-foreground">Cancel & Refund Order</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-full hover:bg-secondary/20 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="bg-secondary/15 rounded-xl p-3.5 border border-border/20 text-xs space-y-1">
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Target Order ID:</span>
              <span className="font-mono text-foreground font-semibold">{orderId}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Total Order Amount:</span>
              <span className="text-foreground font-bold">₹{totalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Cancellation Reason <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-muted-foreground font-normal">(Recorded in audit log)</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Provide explicit reason for order cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Refund Option */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Refund Calculation</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  refundType === "full"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-secondary/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="refundType"
                    checked={refundType === "full"}
                    onChange={() => setRefundType("full")}
                    className="accent-primary"
                  />
                  <span className="text-xs font-bold uppercase tracking-wider">Full Refund (100%)</span>
                </div>
                <span className="text-[11px] font-semibold pl-5">₹{totalRupees.toFixed(2)}</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  refundType === "custom"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-secondary/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="refundType"
                    checked={refundType === "custom"}
                    onChange={() => setRefundType("custom")}
                    className="accent-primary"
                  />
                  <span className="text-xs font-bold uppercase tracking-wider">Custom Refund</span>
                </div>
                <span className="text-[10px] text-muted-foreground pl-5">Partial amount</span>
              </label>
            </div>
          </div>

          {/* Custom Refund Amount Input */}
          {refundType === "custom" && (
            <div className="space-y-1.5 p-3.5 bg-secondary/10 rounded-xl border border-border/30">
              <label className="text-xs font-semibold text-foreground">Custom Refund Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={totalRupees}
                  placeholder={`Max ₹${totalRupees.toFixed(2)}`}
                  value={customRefundRupees}
                  onChange={(e) => setCustomRefundRupees(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Live Refund Summary & Percentage */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-primary font-medium">
              <DollarSign className="w-4 h-4" />
              <span>Calculated Refund:</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-foreground">₹{currentRefundRupees.toFixed(2)}</span>
              <span className="ml-1 text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                ({refundPercentage}%)
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 bg-secondary/20 hover:bg-secondary/30 text-foreground text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm & Refund"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
