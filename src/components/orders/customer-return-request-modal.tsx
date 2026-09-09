"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw, AlertCircle, CheckCircle2, RotateCcw, Replace, MessageSquare, Phone } from "lucide-react";
import { RETURN_REASONS, ReturnReason, ReturnRequestType } from "@/lib/returns/types";

interface VariantOption {
  id: string;
  name: string;
  sku?: string;
  inStock?: boolean;
}

interface CustomerReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderItem: {
    id: string;
    quantity: number;
    price: number;
    variant?: {
      id: string;
      title?: string;
      sku?: string;
      product?: {
        id: string;
        title: string;
        variants?: Array<{
          id: string;
          title?: string;
          name?: string;
          sku?: string;
        }>;
      };
    } | null;
  };
  onSuccess?: () => void;
}

export default function CustomerReturnRequestModal({
  isOpen,
  onClose,
  orderId,
  orderItem,
  onSuccess,
}: CustomerReturnRequestModalProps) {
  const [type, setType] = useState<ReturnRequestType>("RETURN");
  const [reason, setReason] = useState<ReturnReason>("Wrong Size");
  const [customerNotes, setCustomerNotes] = useState("");
  const [replacementVariantId, setReplacementVariantId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const product = orderItem.variant?.product;
  const productTitle = product?.title || "Item";
  const currentVariantTitle = orderItem.variant?.title || orderItem.variant?.sku || "Default Variant";
  const availableVariants = product?.variants || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/return-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: orderItem.id,
          type,
          reason,
          customerNotes: customerNotes.trim(),
          replacementProductId: product?.id,
          replacementVariantId: type === "REPLACEMENT" ? replacementVariantId : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request.");
      }

      setSuccessMsg(data.message || "Request submitted successfully.");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4 overflow-y-auto font-sans">
      <div className="bg-card border border-border shadow-2xl p-6 rounded-3xl w-full max-w-md text-foreground space-y-5 my-auto relative">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-border/40">
          <div>
            <h3 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
              {type === "RETURN" ? <RotateCcw className="w-4 h-4 text-primary" /> : <Replace className="w-4 h-4 text-primary" />}
              Request {type === "RETURN" ? "Return" : "Replacement"}
            </h3>
            <p className="text-[11px] text-muted-foreground font-light pt-0.5">
              Item: <span className="font-medium text-foreground">{productTitle}</span> ({currentVariantTitle})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="font-serif text-sm font-semibold text-foreground">Request Submitted</h4>
            <p className="text-xs text-muted-foreground font-light">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Request Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Request Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("RETURN")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    type === "RETURN"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary/30 border-border/40 text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Return Item
                </button>
                <button
                  type="button"
                  onClick={() => setType("REPLACEMENT")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    type === "REPLACEMENT"
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary/30 border-border/40 text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Replace className="w-3.5 h-3.5" />
                  Replacement Item
                </button>
              </div>
            </div>

            {/* 2. Reason Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Reason for {type === "RETURN" ? "Return" : "Replacement"}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReturnReason)}
                className="w-full py-2.5 px-3 bg-secondary/20 border border-border/40 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Replacement Variant Picker (If REPLACEMENT selected) */}
            {type === "REPLACEMENT" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Desired Replacement Variant
                </label>
                {availableVariants.length > 0 ? (
                  <select
                    value={replacementVariantId}
                    onChange={(e) => setReplacementVariantId(e.target.value)}
                    required
                    className="w-full py-2.5 px-3 bg-secondary/20 border border-border/40 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">-- Select Replacement Size / Variant --</option>
                    {availableVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title || v.name || v.sku || v.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter requested size / variant details"
                    value={replacementVariantId}
                    onChange={(e) => setReplacementVariantId(e.target.value)}
                    required
                    className="w-full py-2.5 px-3 bg-secondary/20 border border-border/40 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>
            )}

            {/* 4. Customer Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Additional Notes & Details
              </label>
              <textarea
                rows={3}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Explain the issue or size requirement..."
                className="w-full py-2 px-3 bg-secondary/20 border border-border/40 rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-light resize-none"
              />
            </div>

            {/* 5. Policy Notice */}
            <div className="p-3 bg-secondary/15 border border-border/20 text-muted-foreground rounded-xl text-[10px] leading-relaxed font-light space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                3-Day Window & Photo Verification
              </div>
              <p>
                Requests must be initiated within <span className="font-semibold text-foreground">3 days</span> of parcel delivery. Photo/video evidence for damaged/defective claims can be shared directly with our support team on <span className="font-semibold text-primary">WhatsApp</span>.
              </p>
            </div>

            {error && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Submitting..." : `Submit ${type === "RETURN" ? "Return" : "Replacement"}`}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="py-2.5 px-4 bg-transparent hover:bg-secondary text-foreground rounded-xl text-xs font-semibold border border-border transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
