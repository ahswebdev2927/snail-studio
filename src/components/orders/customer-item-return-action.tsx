"use client";

import React, { useState } from "react";
import { RotateCcw, Replace, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import CustomerReturnRequestModal from "./customer-return-request-modal";

interface CustomerItemReturnActionProps {
  orderId: string;
  orderStatus: string;
  orderItem: any;
  returnRequests: any[];
  orderDeliveredAt?: Date | string | null;
}

export default function CustomerItemReturnAction({
  orderId,
  orderStatus,
  orderItem,
  returnRequests,
  orderDeliveredAt,
}: CustomerItemReturnActionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Find existing request for this specific item
  const itemRequest = returnRequests?.find((rr) => rr.orderItemId === orderItem.id);

  // Calculate 3-day delivery window eligibility
  const isDelivered = orderStatus.toLowerCase() === "delivered";
  let isWithin3Days = true;
  if (orderDeliveredAt) {
    const delDate = new Date(orderDeliveredAt);
    const msSinceDelivery = Date.now() - delDate.getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (msSinceDelivery > threeDaysMs) {
      isWithin3Days = false;
    }
  }

  // Active status badge helper
  const renderStatusBadge = (req: any) => {
    switch (req.status) {
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
            <Clock className="w-3 h-3" />
            {req.type === "RETURN" ? "Return" : "Replacement"} Pending Review
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            {req.type === "RETURN" ? "Return" : "Replacement"} Approved
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
            <Clock className="w-3 h-3 animate-spin" />
            {req.type === "RETURN" ? "Return" : "Replacement"} Processing
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            {req.type === "RETURN" ? "Return" : "Replacement"} Completed
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-[10px] font-semibold">
            <XCircle className="w-3 h-3" />
            Request Rejected
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-muted-foreground border border-border/30 text-[10px] font-semibold">
            <AlertCircle className="w-3 h-3" />
            Request Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const hasActiveRequest = itemRequest && ["PENDING_REVIEW", "APPROVED", "PROCESSING", "COMPLETED"].includes(itemRequest.status);

  if (!isDelivered) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1.5 font-sans">
      {itemRequest && (
        <div>{renderStatusBadge(itemRequest)}</div>
      )}

      {!hasActiveRequest && isWithin3Days && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/40 text-secondary-foreground border border-border/30 hover:bg-secondary text-[11px] font-medium transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3 h-3 text-primary shrink-0" />
          Request Return / Replacement
        </button>
      )}

      {!hasActiveRequest && !isWithin3Days && (
        <span className="text-[10px] text-muted-foreground/70 font-light">
          Return window closed (3 days post-delivery)
        </span>
      )}

      {isModalOpen && (
        <CustomerReturnRequestModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          orderId={orderId}
          orderItem={orderItem}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
