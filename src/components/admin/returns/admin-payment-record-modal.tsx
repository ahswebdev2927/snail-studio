"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, CreditCard, AlertCircle, CheckCircle2, Loader2, DollarSign, FileText, Hash } from "lucide-react";
import { PAYMENT_METHODS, PaymentMethod } from "@/lib/returns/types";

interface AdminPaymentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    type: "RETURN" | "REPLACEMENT";
    paymentResponsibility: "NONE" | "CUSTOMER_PAYS" | "STORE_PAYS";
    paymentAmount: number; // in paise
    paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID";
  };
  onSuccess: () => void;
}

export function AdminPaymentRecordModal({
  isOpen,
  onClose,
  request,
  onSuccess,
}: AdminPaymentRecordModalProps) {
  const initialRupees = request.paymentAmount > 0 ? (request.paymentAmount / 100).toString() : "120";
  const [amountRupees, setAmountRupees] = useState<string>(initialRupees);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedRupees = parseFloat(amountRupees);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setErrorMessage("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    if (!paymentReference.trim()) {
      setErrorMessage("Payment reference / transaction ID is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentAmountPaise = Math.round(parsedRupees * 100);

      const res = await fetch(`/api/admin/returns/${request.id}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentAmount: paymentAmountPaise,
          paymentMethod,
          paymentReference: paymentReference.trim(),
          paymentNotes: paymentNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to record payment.");
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4 overflow-y-auto font-sans">
      <div className="bg-card border border-border shadow-2xl p-6 rounded-3xl w-full max-w-md text-foreground space-y-5 my-auto relative">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-semibold text-foreground">
                Record Payment
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono pt-0.5">
                Request ID: {request.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guidance Alert */}
        <div className="p-3 bg-secondary/30 border border-border/30 rounded-2xl text-[11px] text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Payment Responsibility:</p>
          <p>
            {request.paymentResponsibility === "CUSTOMER_PAYS"
              ? "Customer is paying Snail Studio for return/replacement charges."
              : request.paymentResponsibility === "STORE_PAYS"
              ? "Snail Studio is paying/refunding customer."
              : "No payment required."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Amount Received / Paid (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="e.g. 120"
              required
              className="w-full bg-secondary/30 border border-border/50 text-foreground rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-semibold"
            />
          </div>

          {/* Payment Method Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full bg-secondary/30 border border-border/50 text-foreground rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium cursor-pointer"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method === "BANK_TRANSFER"
                    ? "Bank Transfer"
                    : method === "UPI"
                    ? "UPI"
                    : method === "CASH"
                    ? "Cash"
                    : method === "RAZORPAY"
                    ? "Razorpay"
                    : "Other"}
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Reference / UPI ID */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
              Transaction Reference / UPI ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. UPI123456789 or TXN98765"
              required
              className="w-full bg-secondary/30 border border-border/50 text-foreground rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Payment Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Payment Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. Customer paid standard replacement fee via UPI."
              className="w-full bg-secondary/30 border border-border/50 text-foreground rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-light"
            />
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Confirm & Record Payment</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2.5 px-4 bg-transparent hover:bg-secondary text-foreground rounded-xl text-xs font-semibold border border-border transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
