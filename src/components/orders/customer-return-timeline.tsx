"use client";

import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  ExternalLink,
  MessageCircle,
  CreditCard,
  AlertCircle,
  Package,
  Loader2,
} from "lucide-react";

export interface CustomerReturnTimelineProps {
  request: {
    id: string;
    orderId: string;
    type: "RETURN" | "REPLACEMENT";
    status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "PROCESSING" | "COMPLETED" | "CANCELLED";
    reason: string;
    customerNotes?: string | null;
    adminNotes?: string | null;
    waybill?: string | null;
    trackingUrl?: string | null;
    paymentResponsibility: "NONE" | "CUSTOMER_PAYS" | "STORE_PAYS";
    paymentAmount: number; // in paise
    paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID";
    paymentMethod?: string | null;
    paymentReference?: string | null;
    createdAt: string | Date;
    replacementProduct?: { title?: string; name?: string } | null;
    replacementVariant?: { title?: string; name?: string } | null;
  };
  storePhone?: string;
}

export function CustomerReturnTimeline({ request, storePhone = "+91 99999 99999" }: CustomerReturnTimelineProps) {
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically load Razorpay SDK checkout script if not present
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePayFee = async () => {
    setIsPaying(true);
    setPaymentError(null);

    try {
      const res = await fetch(`/api/returns/${request.id}/pay-fee`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.paymentSession) {
        throw new Error(data.error || "Failed to initialize payment session.");
      }

      const { paymentSession } = data;

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
          description: `${request.type === "RETURN" ? "Return Pickup Fee" : "Replacement Exchange Fee"} for Request #${request.id}`,
          order_id: paymentSession.gatewayOrderId || paymentSession.id,
          handler: async function (response: any) {
            setIsPaying(true);
            try {
              const confirmRes = await fetch(`/api/returns/${request.id}/pay-fee`, {
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
                setPaymentError(confirmData.error || "Payment verification failed.");
                setIsPaying(false);
              }
            } catch (err: any) {
              console.error(err);
              setPaymentError("An error occurred during payment verification.");
              setIsPaying(false);
            }
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
      } else {
        // Mock fallback for dev mode
        const confirmRes = await fetch(`/api/returns/${request.id}/pay-fee`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: `pay_mock_${Date.now()}`,
            gatewayOrderId: paymentSession.gatewayOrderId || paymentSession.id,
          }),
        });
        const confirmData = await confirmRes.json();
        if (confirmRes.ok && confirmData.success) {
          window.location.reload();
        } else {
          setPaymentError(confirmData.error || "Payment failed.");
          setIsPaying(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.message || "An unexpected error occurred.");
      setIsPaying(false);
    }
  };
  const isReturn = request.type === "RETURN";
  const isPending = request.status === "PENDING_REVIEW";
  const isApproved = request.status === "APPROVED";
  const isProcessing = request.status === "PROCESSING";
  const isCompleted = request.status === "COMPLETED";
  const isRejected = request.status === "REJECTED";

  const cleanPhone = storePhone.replace(/[^0-9]/g, "");
  const amountRupees = (request.paymentAmount / 100).toFixed(2);

  const whatsappMessage = encodeURIComponent(
    `Hi Snail Studio! I am requesting payment instructions for my ${request.type === "RETURN" ? "Return" : "Replacement"} Request ID: ${request.id} (Order #${request.orderId}). Amount Due: ₹${amountRupees}.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  // Build timeline steps
  let steps: Array<{ title: string; subtitle: string; active: boolean; current: boolean; completed: boolean }> = [];

  if (isReturn) {
    if (request.paymentResponsibility === "CUSTOMER_PAYS") {
      steps = [
        {
          title: "Requested",
          subtitle: "Pending Admin Review",
          active: true,
          current: isPending,
          completed: !isPending && !isRejected,
        },
        {
          title: "Approved",
          subtitle: "Return Accepted",
          active: isApproved || isProcessing || isCompleted,
          current: isApproved && request.paymentStatus !== "PAID",
          completed: isProcessing || isCompleted,
        },
        {
          title: "Pickup Fee",
          subtitle: request.paymentStatus === "PAID" ? "Fee Confirmed" : "Fee Pending",
          active: request.paymentStatus === "PAID" || isProcessing || isCompleted,
          current: isApproved && request.paymentStatus === "PENDING",
          completed: request.paymentStatus === "PAID" || isProcessing || isCompleted,
        },
        {
          title: "Reverse Pickup",
          subtitle: request.waybill ? `AWB: ${request.waybill}` : "Pickup Scheduled",
          active: (isApproved && Boolean(request.waybill)) || isProcessing || isCompleted,
          current: isProcessing,
          completed: isCompleted,
        },
        {
          title: "Received",
          subtitle: "Delivered to Warehouse",
          active: isCompleted,
          current: isCompleted,
          completed: isCompleted,
        },
      ];
    } else {
      steps = [
        {
          title: "Requested",
          subtitle: "Pending Admin Review",
          active: true,
          current: isPending,
          completed: !isPending && !isRejected,
        },
        {
          title: "Approved",
          subtitle: "Return Accepted",
          active: isApproved || isProcessing || isCompleted,
          current: isApproved && !request.waybill,
          completed: isProcessing || isCompleted,
        },
        {
          title: "Reverse Pickup",
          subtitle: request.waybill ? `AWB: ${request.waybill}` : "Pickup Scheduled",
          active: (isApproved && Boolean(request.waybill)) || isProcessing || isCompleted,
          current: isProcessing,
          completed: isCompleted,
        },
        {
          title: "Received",
          subtitle: "Delivered to Warehouse",
          active: isCompleted,
          current: isCompleted,
          completed: isCompleted,
        },
      ];
    }
  } else {
    // Replacement Steps
    steps = [
      {
        title: "Requested",
        subtitle: "Pending Admin Review",
        active: true,
        current: isPending,
        completed: !isPending && !isRejected,
      },
      {
        title: "Approved",
        subtitle: "Replacement Accepted",
        active: isApproved || isProcessing || isCompleted,
        current: isApproved && request.paymentStatus !== "PAID" && request.paymentResponsibility === "CUSTOMER_PAYS",
        completed: isProcessing || isCompleted,
      },
      {
        title: "Payment",
        subtitle: request.paymentStatus === "PAID" ? "Payment Confirmed" : request.paymentResponsibility === "NONE" ? "No Payment Required" : "Payment Pending",
        active: request.paymentStatus === "PAID" || request.paymentResponsibility === "NONE" || isProcessing || isCompleted,
        current: isApproved && request.paymentStatus === "PENDING" && request.paymentResponsibility === "CUSTOMER_PAYS",
        completed: request.paymentStatus === "PAID" || request.paymentResponsibility === "NONE" || isProcessing || isCompleted,
      },
      {
        title: "REPL Exchange",
        subtitle: request.waybill ? `Exchange AWB: ${request.waybill}` : "Exchange Shipment",
        active: (isApproved && Boolean(request.waybill)) || isProcessing || isCompleted,
        current: isProcessing,
        completed: isCompleted,
      },
      {
        title: "Completed",
        subtitle: "Exchange Delivered",
        active: isCompleted,
        current: isCompleted,
        completed: isCompleted,
      },
    ];
  }

  return (
    <div className="bg-card border border-border/30 rounded-2xl p-4 md:p-5 space-y-4 font-sans text-foreground">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/20">
        <div className="flex items-center space-x-2">
          <span
            className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 ${
              isReturn
                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}
          >
            {isReturn ? <RotateCcw className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
            <span>{request.type} REQUEST</span>
          </span>
          <span className="text-[11px] font-mono font-medium text-muted-foreground">
            ID: {request.id}
          </span>
        </div>

        <span
          className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 ${
            isPending
              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              : isApproved
              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
              : isRejected
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : isProcessing
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          }`}
        >
          {isPending && <Clock className="w-3 h-3 animate-pulse" />}
          {isApproved && <CheckCircle2 className="w-3 h-3" />}
          {isRejected && <XCircle className="w-3 h-3" />}
          {isProcessing && <Truck className="w-3 h-3 animate-pulse" />}
          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
          <span>{request.status.replace(/_/g, " ")}</span>
        </span>
      </div>

      {/* Replacement Variant info if replacement */}
      {!isReturn && request.replacementProduct && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
            Requested Replacement Variant
          </span>
          <p className="font-semibold text-foreground">
            {request.replacementProduct.title || request.replacementProduct.name || "Replacement Item"}
          </p>
          {request.replacementVariant && (
            <p className="text-[11px] text-muted-foreground">
              Size / Style: {request.replacementVariant.title || request.replacementVariant.name || "Selected Variant"}
            </p>
          )}
        </div>
      )}

      {/* Visual Timeline Stepper */}
      {!isRejected && (
        <div className="py-2">
          <div className="flex items-center justify-between relative">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center relative z-10 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.completed
                      ? "bg-emerald-500 text-white shadow-sm"
                      : step.current
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse"
                      : step.active
                      ? "bg-secondary text-foreground border border-border"
                      : "bg-secondary/40 text-muted-foreground/50 border border-border/30"
                  }`}
                >
                  {step.completed ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`text-[11px] font-semibold mt-1.5 ${step.active ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {step.title}
                </span>
                <span className="text-[9px] text-muted-foreground font-light hidden sm:block">
                  {step.subtitle}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Payment Status Section */}
      {request.paymentResponsibility === "CUSTOMER_PAYS" && request.paymentStatus === "PENDING" && !isRejected && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                {isReturn ? "Reverse Shipment Fee Required" : "Replacement Shipping Fee Required"}: ₹{amountRupees}
              </h4>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                {isReturn
                  ? "Payment for reverse pickup shipping is required before scheduling your return pickup. Please contact support team for payment details (UPI/QR)."
                  : "Payment for replacement shipping is required before creating your exchange parcel. Please contact support team for payment details (UPI/QR)."}
              </p>
            </div>
          </div>

          {paymentError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{paymentError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isPaying}
              onClick={handlePayFee}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isPaying ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <CreditCard className="w-4 h-4 shrink-0" />
              )}
              <span>Pay Online via Razorpay</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-white shrink-0 fill-current" />
              <span>Contact Support</span>
            </a>
          </div>
        </div>
      )}

      {request.paymentResponsibility === "CUSTOMER_PAYS" && request.paymentStatus === "PAID" && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium text-foreground">
              {isReturn ? "Reverse Shipment Fee Paid: " : "Replacement Shipping Fee Paid: "}
              <strong className="text-emerald-500">₹{amountRupees}</strong> ({request.paymentMethod || "UPI"}{request.paymentReference ? ` - Ref: ${request.paymentReference}` : ""})
            </span>
          </div>
        </div>
      )}

      {request.paymentResponsibility === "STORE_PAYS" && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-medium text-foreground">
            Store Refund / Adjustment Pending: <strong className="text-indigo-400">₹{amountRupees}</strong>
          </span>
        </div>
      )}

      {/* Rejection Notice */}
      {isRejected && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>Request Declined</span>
          </div>
          {request.adminNotes && (
            <p className="text-muted-foreground italic bg-background/50 p-2.5 rounded-xl border border-border/20">
              Reason: "{request.adminNotes}"
            </p>
          )}
        </div>
      )}

      {/* Reverse / Exchange Tracking Link */}
      {request.waybill && request.trackingUrl && (
        <div className="pt-2 border-t border-border/20 flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1 font-mono">
            <Truck className="w-3.5 h-3.5 text-primary" /> Delhivery AWB: <strong>{request.waybill}</strong>
          </span>
          <a
            href={request.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold flex items-center gap-1"
          >
            Track {isReturn ? "Return" : "Exchange"} Parcel <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
