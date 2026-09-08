"use client";

import React, { useState } from "react";
import {
  X,
  RotateCcw,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Truck,
  FileText,
} from "lucide-react";
import { REATTEMPT_ELIGIBLE_NSL_CODES } from "@/lib/shipping/providers/delhivery/delhivery-exception-codes";

interface NDRActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  exception: {
    id: string;
    exceptionType: string;
    providerCode?: string | null;
    reason?: string | null;
    remark?: string | null;
    attemptCount?: number;
    status: string;
    shipment?: {
      id: string;
      waybill?: string | null;
      trackingNumber?: string;
      orderId?: string;
      provider?: string;
      status?: string;
    };
  } | null;
  initialActionType?: 'REATTEMPT' | 'CUSTOMER_CONTACTED' | 'RESOLVE' | 'RTO_REQUESTED' | 'PICKUP_RESCHEDULE';
}

export function NDRActionModal({
  isOpen,
  onClose,
  onSuccess,
  exception,
  initialActionType = "REATTEMPT",
}: NDRActionModalProps) {
  const [actionType, setActionType] = useState<string>(initialActionType);
  const [remarks, setRemarks] = useState("");
  const [customerResponse, setCustomerResponse] = useState("");
  const [deferredDate, setDeferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize actionType whenever modal is opened or initialActionType changes
  React.useEffect(() => {
    if (isOpen) {
      setActionType(initialActionType);
      setRemarks("");
      setCustomerResponse("");
      setDeferredDate("");
      setError(null);
    }
  }, [isOpen, initialActionType]);

  if (!isOpen || !exception) return null;

  const code = (exception.providerCode || "").toUpperCase();
  const isReattemptEligible = REATTEMPT_ELIGIBLE_NSL_CODES.includes(code as any);

  // Action-specific titles & descriptions for high UX clarity
  const actionDetails: Record<string, { title: string; subtitle: string; placeholder: string; ctaText: string; loadingText: string }> = {
    REATTEMPT: {
      title: "Submit Delivery Re-attempt",
      subtitle: `Requests Delhivery to re-attempt customer delivery for AWB ${exception.shipment?.waybill || exception.shipment?.trackingNumber}`,
      placeholder: "Add instructions for courier (e.g. Deliver after 4 PM, call customer on arrival...)",
      ctaText: "Submit Re-attempt Request",
      loadingText: "Requesting Re-attempt...",
    },
    CUSTOMER_CONTACTED: {
      title: "Log Customer Contact & Notes",
      subtitle: "Records internal customer outreach details in the shipment audit log",
      placeholder: "Enter additional internal notes or follow-up details...",
      ctaText: "Save Customer Note",
      loadingText: "Saving Note...",
    },
    RESOLVE: {
      title: "Manual Admin Override",
      subtitle: "Manually closes the active NDR exception in Snail Studio",
      placeholder: "Reason for manual admin override (e.g. Cleared out-of-band with carrier)...",
      ctaText: "Apply Admin Override",
      loadingText: "Applying Override...",
    },
    RTO_REQUESTED: {
      title: "Initiate Return to Origin (RTO)",
      subtitle: "Flags package for return to seller warehouse",
      placeholder: "Enter the reason for initiating RTO, e.g. customer refused delivery, customer unreachable after attempts, delivery no longer required...",
      ctaText: "Confirm Return to Origin",
      loadingText: "Requesting RTO...",
    },
  };

  const currentDetails = actionDetails[actionType] || actionDetails.REATTEMPT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);

      const body: any = {
        actionType,
        notes: remarks.trim() || undefined,
      };

      if (!remarks.trim()) {
        setError("Operational remarks / instructions are required.");
        setSubmitting(false);
        return;
      }

      if (actionType === "CUSTOMER_CONTACTED") {
        if (!customerResponse.trim()) {
          setError("Customer response description is required.");
          setSubmitting(false);
          return;
        }
        body.customerResponse = customerResponse.trim();
      }

      if (actionType === "DEFER_DLV") {
        if (!deferredDate) {
          setError("Deferred delivery date is required.");
          setSubmitting(false);
          return;
        }
      }

      if (actionType === "REATTEMPT" || actionType === "DEFER_DLV" || actionType === "RTO_REQUESTED" || actionType === "PICKUP_RESCHEDULE") {
        body.payload = {
          remarks: remarks.trim(),
          deferredDate: actionType === "DEFER_DLV" ? deferredDate : undefined,
        };
      }

      const res = await fetch(`/api/admin/shipping/exceptions/${exception.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "RTO request could not be submitted. The shipment has not been marked as successfully returned. Please review the carrier response and try again if appropriate.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting action.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#a95423]/10 text-[#a95423] rounded-xl">
              {actionType === "CUSTOMER_CONTACTED" && <PhoneCall className="w-5 h-5 text-blue-600" />}
              {actionType === "RESOLVE" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {actionType === "RTO_REQUESTED" && <AlertTriangle className="w-5 h-5 text-red-600" />}
              {actionType === "REATTEMPT" && <RotateCcw className="w-5 h-5 text-[#a95423]" />}
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">{currentDetails.title}</h4>
              <p className="text-xs text-slate-500">
                {currentDetails.subtitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Shipment / Action Context Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-700">Shipment Waybill:</span>
            <span className="font-mono font-bold text-slate-900">{exception.shipment?.waybill || exception.shipment?.trackingNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-700">Carrier Exception Code:</span>
            <span className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">{code || "N/A"} ({exception.reason || "Exception"})</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[11px]">
            <span className="text-slate-600">Current Shipment Status:</span>
            <span className="font-mono font-semibold uppercase text-slate-800">{exception.shipment?.status || "IN_TRANSIT"}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-600">Exception Status:</span>
            <span className="font-mono font-semibold uppercase text-amber-800">{exception.status}</span>
          </div>

          {actionType === "REATTEMPT" && (
            <div className="pt-1 flex items-center justify-between border-t border-slate-200 text-[11px]">
              <span className="text-slate-600">Delhivery API Eligibility:</span>
              {isReattemptEligible ? (
                <span className="text-emerald-700 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Eligible for API Re-attempt</span>
                </span>
              ) : (
                <span className="text-amber-700 font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Manual Escalation Only</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Detailed Manual Admin Override Warning */}
        {actionType === "RESOLVE" && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-1.5 text-xs">
            <h5 className="font-bold flex items-center space-x-1.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Manual Admin Override Notice</span>
            </h5>
            <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
              This action only closes the exception in Snail Studio. It does <strong>NOT</strong> change Delhivery's shipment status or issue carrier instructions.
            </p>
          </div>
        )}

        {/* Detailed RTO Warning & Guidance Section */}
        {actionType === "RTO_REQUESTED" && (
          <div className="space-y-3 text-xs">
            {/* Important Notice */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl space-y-1.5">
              <h5 className="font-bold flex items-center space-x-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Important Notice</span>
              </h5>
              <p className="text-[11px] leading-relaxed text-amber-800">
                This action will request Delhivery to stop the forward delivery process and return this shipment to the seller/origin warehouse.
              </p>
              <ul className="text-[11px] space-y-1 text-amber-800 pl-4 list-disc font-medium">
                <li>The shipment will be marked as <strong>RTO Requested</strong> in Snail Studio.</li>
                <li>A carrier-side cancellation/RTO request will be sent to Delhivery.</li>
                <li>The shipment is <strong>NOT</strong> considered returned yet.</li>
                <li>Delhivery tracking must confirm the subsequent RTO movement.</li>
                <li>No refund will be issued automatically by this action.</li>
              </ul>
            </div>

            {/* Confirmation Consequence Warning */}
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl space-y-1">
              <p className="font-bold flex items-center space-x-1 text-red-900">
                <span>⚠️ Please confirm carefully</span>
              </p>
              <p className="text-[11px] text-red-700 leading-relaxed">
                Once submitted, the forward-delivery process will be requested to stop and the shipment will be sent into the Return-to-Origin workflow. This action should only be used when the shipment should no longer be delivered to the customer.
              </p>
            </div>

            {/* Lifecycle Progression Explanation */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
              <p className="font-semibold text-slate-800 text-[11px]">What happens next?</p>
              <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 font-mono">
                <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">RTO Requested</span>
                <span>➔</span>
                <span>Waiting for Delhivery</span>
                <span>➔</span>
                <span>RTO In Transit</span>
                <span>➔</span>
                <span>Returned to Origin</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Specific Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {actionType === "CUSTOMER_CONTACTED" && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Customer Conversation Outcome <span className="text-[#a95423]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Customer agreed for reattempt tomorrow after 2 PM"
                value={customerResponse}
                onChange={(e) => setCustomerResponse(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#a95423]"
                required
              />
            </div>
          )}

          {actionType === "DEFER_DLV" && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Deferred Delivery Date <span className="text-[#a95423]">*</span>
              </label>
              <input
                type="date"
                value={deferredDate}
                onChange={(e) => setDeferredDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#a95423]"
                required
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Operational Remarks / Instructions <span className="text-[#a95423]">*</span>
            </label>
            <textarea
              rows={3}
              placeholder={currentDetails.placeholder}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#a95423] resize-none"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1">
              This note will be recorded in the shipment exception/action history for audit purposes.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || (actionType === "REATTEMPT" && !isReattemptEligible && exception.exceptionType === "DELIVERY_NDR")}
              className="px-4 py-2 font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm disabled:opacity-50 transition flex items-center space-x-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{currentDetails.loadingText}</span>
                </>
              ) : (
                <span>{currentDetails.ctaText}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
