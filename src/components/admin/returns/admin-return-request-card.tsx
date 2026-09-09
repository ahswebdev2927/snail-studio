"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Package,
  AlertCircle,
  Loader2,
  FileText,
  CreditCard,
  ChevronRight,
  Sparkles,
  Truck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export interface ReturnRequestItem {
  id: string;
  orderId: string;
  orderItemId: string;
  customerId: string;
  type: "RETURN" | "REPLACEMENT";
  reason: string;
  customerNotes?: string | null;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  adminNotes?: string | null;
  replacementProductId?: string | null;
  replacementVariantId?: string | null;
  waybill?: string | null;
  trackingUrl?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  paymentResponsibility: "NONE" | "CUSTOMER_PAYS" | "STORE_PAYS";
  paymentAmount: number;
  paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID";
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    totalAmount: number;
    status: string;
    addresses?: Array<{
      name: string;
      phone: string;
      city: string;
      state: string;
    }>;
  };
  customer?: {
    id: string;
    name?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
  };
  orderItem?: {
    id: string;
    price: number;
    quantity: number;
    variant?: {
      id: string;
      name?: string | null;
      product?: {
        id: string;
        title?: string | null;
        name?: string | null;
        images?: any;
      };
    };
  };
  replacementProduct?: {
    id: string;
    title?: string | null;
  };
  replacementVariant?: {
    id: string;
    title?: string | null;
    name?: string | null;
    price?: number | null;
  };
  reviewer?: {
    id: string;
    name?: string | null;
    phoneNumber?: string | null;
  };
}

interface AdminReturnRequestCardProps {
  request: ReturnRequestItem;
  onRefresh?: () => void;
}

export function AdminReturnRequestCard({ request, onRefresh }: AdminReturnRequestCardProps) {
  const [paymentResponsibility, setPaymentResponsibility] = useState<"NONE" | "CUSTOMER_PAYS" | "STORE_PAYS">(
    request.paymentResponsibility || "NONE"
  );
  const [adminNotes, setAdminNotes] = useState(request.adminNotes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPending = request.status === "PENDING_REVIEW";
  const isApproved = request.status === "APPROVED";
  const isRejected = request.status === "REJECTED";
  const isProcessing = request.status === "PROCESSING";
  const isCompleted = request.status === "COMPLETED";

  const customerName =
    request.customer?.name ||
    request.order?.addresses?.[0]?.name ||
    request.customer?.phoneNumber ||
    "Customer";
  const customerPhone = request.customer?.phoneNumber || request.order?.addresses?.[0]?.phone || "";

  const originalProductTitle =
    request.orderItem?.variant?.product?.title ||
    request.orderItem?.variant?.product?.name ||
    "Original Product";
  const originalVariantName = request.orderItem?.variant?.name || "";

  const isCustomerPaymentPending =
    request.paymentResponsibility === "CUSTOMER_PAYS" && request.paymentStatus !== "PAID";

  const handleCreatePickup = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/returns/${request.id}/create-pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to create reverse pickup");
        return;
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while creating reverse pickup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkReceived = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/returns/${request.id}/mark-received`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to mark return as received");
        return;
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while updating return status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setErrorMessage(null);
    if (!paymentResponsibility) {
      setErrorMessage("Please select payment responsibility before approving.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/returns/${request.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentResponsibility,
          adminNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to approve return request");
        return;
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during approval");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setErrorMessage(null);
    if (!adminNotes.trim()) {
      setErrorMessage("Admin notes are mandatory when rejecting a request.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/returns/${request.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNotes: adminNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to reject return request");
        return;
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during rejection");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition duration-200 relative overflow-hidden flex flex-col justify-between">
      {/* Top Bar with Type & Status Badges */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-4">
          <div className="flex items-center space-x-2.5">
            <span
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 ${
                request.type === "RETURN"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              }`}
            >
              {request.type === "RETURN" ? (
                <RotateCcw className="w-3 h-3" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              <span>{request.type} REQUEST</span>
            </span>

            <span className="text-xs font-mono font-bold text-muted-foreground">
              ID: {request.id}
            </span>
          </div>

          <span
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 ${
              isPending
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                : isApproved
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isRejected
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : isProcessing
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
            }`}
          >
            {isPending && <Clock className="w-3 h-3" />}
            {isApproved && <CheckCircle2 className="w-3 h-3" />}
            {isRejected && <XCircle className="w-3 h-3" />}
            {isProcessing && <Truck className="w-3 h-3" />}
            {isCompleted && <CheckCircle2 className="w-3 h-3" />}
            <span>{request.status.replace(/_/g, " ")}</span>
          </span>
        </div>

        {/* Order & Customer Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/20 rounded-2xl p-4 border border-border/30">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Package className="w-3 h-3" /> Order Details
            </span>
            <div className="flex items-center space-x-2">
              <Link
                href={`/admin/orders?q=${request.orderId}`}
                className="font-mono font-bold text-sm text-primary hover:underline flex items-center gap-1"
              >
                #{request.orderId}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Requested: {new Date(request.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> Customer Information
            </span>
            <p className="text-xs font-semibold text-foreground">{customerName}</p>
            {customerPhone && (
              <p className="text-[11px] font-mono text-muted-foreground">{customerPhone}</p>
            )}
          </div>
        </div>

        {/* Item & Replacement Details */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Original Item
            </span>
            <div className="p-3 bg-secondary/30 border border-border/30 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">{originalProductTitle}</p>
                {originalVariantName && (
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Variant: {originalVariantName}
                  </p>
                )}
              </div>
              <span className="text-xs font-mono font-semibold text-foreground">
                Qty: {request.orderItem?.quantity || 1}
              </span>
            </div>
          </div>

          {request.type === "REPLACEMENT" && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Requested Replacement
              </span>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <p className="text-xs font-semibold text-foreground">
                  {request.replacementProduct?.title || "Replacement Product"}
                </p>
                <p className="text-[11px] text-indigo-300 font-medium">
                  Variant: {request.replacementVariant?.title || request.replacementVariant?.name || "Selected Variant"}
                </p>
              </div>
            </div>
          )}

          {/* Reason & Customer Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-secondary/20 rounded-xl border border-border/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Return Reason
              </span>
              <p className="text-xs font-semibold text-foreground">{request.reason}</p>
            </div>

            <div className="p-3 bg-secondary/20 rounded-xl border border-border/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Customer Notes
              </span>
              <p className="text-xs font-light text-foreground italic">
                {request.customerNotes ? `"${request.customerNotes}"` : "No customer notes provided."}
              </p>
            </div>
          </div>
        </div>

        {/* Reverse Pickup / Logistics Info if waybill exists or processing */}
        {request.waybill && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-2 mt-4">
            <div className="flex items-center justify-between text-[11px] text-blue-300 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-400" /> Reverse Pickup Shipment
              </span>
              <span className="font-mono text-xs text-blue-200">AWB: {request.waybill}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">Provider: <span className="font-semibold text-foreground">Delhivery (Pickup)</span></p>
              {request.trackingUrl && (
                <a
                  href={request.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Track Reverse Shipment <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Existing Admin Notes & Reviewer Info if already reviewed */}
        {!isPending && (
          <div className="p-4 bg-secondary/30 border border-border/40 rounded-2xl space-y-2 mt-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Reviewed Decision
              </span>
              {request.reviewedAt && (
                <span>
                  {new Date(request.reviewedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>

            <div className="text-xs space-y-1">
              <p className="text-muted-foreground">
                Payment Responsibility:{" "}
                <span className="font-semibold text-foreground">
                  {request.paymentResponsibility === "NONE"
                    ? "No Payment Required"
                    : request.paymentResponsibility === "CUSTOMER_PAYS"
                    ? "Customer Pays Snail Studio"
                    : "Snail Studio Pays Customer"}
                </span>
              </p>
              <p className="text-muted-foreground">
                Payment Status:{" "}
                <span
                  className={`font-semibold ${
                    request.paymentStatus === "PAID"
                      ? "text-emerald-400"
                      : request.paymentStatus === "PENDING"
                      ? "text-amber-400"
                      : "text-foreground"
                  }`}
                >
                  {request.paymentStatus}
                </span>
              </p>
              {request.adminNotes && (
                <p className="text-foreground italic bg-background/50 p-2 rounded-lg border border-border/20">
                  Admin Note: "{request.adminNotes}"
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Alert Display */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Phase V3-19: Create Reverse Pickup Action for Approved Returns */}
      {isApproved && request.type === "RETURN" && !request.waybill && (
        <div className="mt-6 pt-5 border-t border-border/40 space-y-3">
          {isCustomerPaymentPending && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Customer payment is PENDING. Record payment before creating reverse pickup.</span>
            </div>
          )}

          <button
            onClick={handleCreatePickup}
            disabled={isSubmitting || isCustomerPaymentPending}
            className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
            <span>Create Delhivery Reverse Pickup</span>
          </button>
        </div>
      )}

      {/* Phase V3-19: Mark Return Received Action for Processing Returns */}
      {isProcessing && request.type === "RETURN" && (
        <div className="mt-6 pt-5 border-t border-border/40 space-y-3">
          <button
            onClick={handleMarkReceived}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Mark Return Received (Complete Request)</span>
          </button>
        </div>
      )}

      {/* Review Form for Pending Requests */}
      {isPending && (
        <div className="mt-6 pt-5 border-t border-border/40 space-y-4">
          <div className="space-y-3">
            {/* Who pays whom selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                Who pays whom? <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentResponsibility}
                onChange={(e) =>
                  setPaymentResponsibility(e.target.value as "NONE" | "CUSTOMER_PAYS" | "STORE_PAYS")
                }
                className="w-full bg-secondary/30 border border-border/50 text-foreground rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-medium cursor-pointer"
              >
                <option value="NONE">No Payment Required</option>
                <option value="CUSTOMER_PAYS">Customer Pays Snail Studio</option>
                <option value="STORE_PAYS">Snail Studio Pays Customer</option>
              </select>
            </div>

            {/* Admin Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                Admin Notes {errorMessage && errorMessage.includes("mandatory") && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter review notes (mandatory for rejection, optional for approval)..."
                rows={2}
                className="w-full bg-secondary/30 border border-border/50 text-foreground rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary font-light"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Approve {request.type === "RETURN" ? "Return" : "Replacement"}</span>
            </button>

            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>Reject {request.type === "RETURN" ? "Return" : "Replacement"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
