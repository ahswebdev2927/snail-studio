"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Truck,
  ExternalLink,
  Printer,
  XCircle,
  RotateCcw,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { ALLOWED_DELHIVERY_CANCEL_STATUSES } from "@/lib/shipping/types";

export interface ShipmentAttemptItem {
  id: string;
  provider: "delhivery" | "external";
  courierOrderId: string;
  attemptNumber: number;
  carrier: string;
  waybill?: string | null;
  trackingNumber: string;
  trackingUrl?: string | null;
  status: string;
  shippedAt?: string | null;
  estimatedDeliveryAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  externalCourierName?: string | null;
  externalMetadata?: string | null;
  trackingEvents?: Array<{
    id: string;
    status: string;
    location?: string | null;
    description?: string | null;
    timestamp: string;
  }>;
}

interface ShipmentAttemptsTimelineProps {
  orderId: string;
  shipments: ShipmentAttemptItem[];
  onRefresh: () => void;
  onOpenDispatchModal: () => void;
}

export function ShipmentAttemptsTimeline({
  orderId,
  shipments = [],
  onRefresh,
  onOpenDispatchModal,
}: ShipmentAttemptsTimelineProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [redispatchModalOpen, setRedispatchModalOpen] = useState(false);
  const [redispatchReason, setRedispatchReason] = useState("");
  const [redispatchProvider, setRedispatchProvider] = useState<"delhivery" | "external">("delhivery");
  const [redispatchCarrier, setRedispatchCarrier] = useState("DTDC");
  const [redispatchTrackingUrl, setRedispatchTrackingUrl] = useState("");
  const [redispatching, setRedispatching] = useState(false);
  const [redispatchError, setRedispatchError] = useState<string | null>(null);

  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  // Active shipment is non-cancelled
  const activeShipment = shipments.find((s) => s.status !== "cancelled");
  const sortedShipments = [...shipments].sort((a, b) => b.attemptNumber - a.attemptNumber);

  // Check Delhivery cancellation status rules
  const checkDelhiveryCancelEligibility = (shipment: ShipmentAttemptItem) => {
    if (shipment.provider !== "delhivery") return { eligible: true };
    const currentStatus = shipment.status.toLowerCase();
    const isDisallowed = ["dispatched", "out_for_delivery", "delivered", "rto"].includes(currentStatus);
    const isAllowed = ALLOWED_DELHIVERY_CANCEL_STATUSES.includes(currentStatus);

    if (isDisallowed || !isAllowed) {
      return {
        eligible: false,
        reason: `Delhivery package status is '${shipment.status}'. Delhivery API rules restrict cancellation to Manifested, In Transit, or Pending status only.`,
      };
    }
    return { eligible: true };
  };

  const handleCancelShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelError(null);

    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      setCancelError("Please enter a valid cancellation reason (minimum 3 characters).");
      return;
    }

    try {
      setCancelling(true);
      const res = await fetch(`/api/admin/orders/${orderId}/shipment`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel shipment");
      }

      setCancelModalOpen(false);
      setCancelReason("");
      onRefresh();
    } catch (err: any) {
      setCancelError(err.message || "An error occurred while cancelling.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRedispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedispatchError(null);

    if (!redispatchReason.trim() || redispatchReason.trim().length < 3) {
      setRedispatchError("Please enter a valid reason for re-dispatch (minimum 3 characters).");
      return;
    }

    if (redispatchProvider === "external" && !redispatchTrackingUrl.trim()) {
      setRedispatchError("Manual Tracking URL is required for external courier re-dispatch.");
      return;
    }

    try {
      setRedispatching(true);
      const res = await fetch(`/api/admin/orders/${orderId}/regenerate-awb`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: redispatchProvider,
          reason: redispatchReason.trim(),
          externalCourierName: redispatchProvider === "external" ? redispatchCarrier : undefined,
          externalTrackingUrl: redispatchProvider === "external" ? redispatchTrackingUrl.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to re-dispatch shipment");
      }

      setRedispatchModalOpen(false);
      setRedispatchReason("");
      onRefresh();
    } catch (err: any) {
      setRedispatchError(err.message || "An error occurred while re-dispatching.");
    } finally {
      setRedispatching(false);
    }
  };

  const printLabel = async (size: "4R" | "A4") => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/label?pdfSize=${size}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.pdfUrl) {
        alert(data.error || "Failed to generate label PDF");
        return;
      }
      window.open(data.pdfUrl, "_blank");
    } catch (err: any) {
      alert(err.message || "Error opening label PDF");
    }
  };

  if (shipments.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
        <Truck className="w-10 h-10 text-[#a95423] mx-auto mb-3 opacity-80" />
        <h4 className="text-sm font-semibold text-slate-800">No Shipment Created Yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Create an automated Delhivery dispatch or manual external courier dispatch for this order.
        </p>
        <button
          onClick={onOpenDispatchModal}
          className="mt-4 px-4 py-2 text-xs font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm transition inline-flex items-center space-x-2 cursor-pointer"
        >
          <Truck className="w-4 h-4" />
          <span>Dispatch Order Now</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800 flex items-center space-x-2">
          <Truck className="w-4 h-4 text-[#a95423]" />
          <span>Shipment Attempts History ({shipments.length})</span>
        </h4>

        {!activeShipment && (
          <button
            onClick={onOpenDispatchModal}
            className="px-3 py-1.5 text-xs font-medium bg-[#a95423] hover:bg-[#94451b] text-white rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Dispatch Attempt</span>
          </button>
        )}
      </div>

      {/* Shipment Attempts Stack */}
      <div className="space-y-3">
        {sortedShipments.map((ship) => {
          const isActive = ship.status !== "cancelled";
          const cancelEligibility = checkDelhiveryCancelEligibility(ship);
          const isExpanded = expandedAttemptId === ship.id;

          return (
            <div
              key={ship.id}
              className={`border rounded-2xl p-5 transition ${
                isActive
                  ? "bg-white border-[#a95423]/30 shadow-sm"
                  : "bg-slate-50/80 border-slate-200 opacity-80"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      isActive ? "bg-[#a95423]/10 text-[#a95423] border border-[#a95423]/20" : "bg-slate-200 text-slate-600 border border-slate-300"
                    }`}
                  >
                    Attempt #{ship.attemptNumber} {isActive ? "(Active)" : "(Cancelled)"}
                  </span>

                  <div>
                    <h5 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <span>{ship.carrier}</span>
                      {ship.provider === "external" && (
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                          External Courier
                        </span>
                      )}
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tracking / Waybill: <code className="text-[#a95423] font-mono font-semibold">{ship.trackingNumber}</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${
                      ship.status === "delivered"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : ship.status === "cancelled"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {ship.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Extra Details & External Tracking Button */}
              <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Created:</span>{" "}
                  {new Date(ship.createdAt).toLocaleString()}
                </div>
                {ship.trackingUrl && (
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400">Tracking Link:</span>{" "}
                    <a
                      href={ship.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#a95423] hover:underline font-medium flex items-center space-x-1 truncate max-w-xs"
                    >
                      <span>{ship.trackingUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Active Shipment Action Toolbar */}
              {isActive && (
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    {ship.provider === "delhivery" && (
                      <button
                        onClick={() => printLabel("4R")}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#a95423]" />
                        <span>Print 4R Label</span>
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/admin/shipments?q=${encodeURIComponent(ship.waybill || ship.trackingNumber || ship.courierOrderId)}`}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#a95423]/10 hover:bg-[#a95423]/20 text-[#a95423] border border-[#a95423]/30 rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>View Shipment Details</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                </div>
              )}

              {/* Scan Events Toggle */}
              {ship.trackingEvents && ship.trackingEvents.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                  <button
                    onClick={() => setExpandedAttemptId(isExpanded ? null : ship.id)}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer font-medium"
                  >
                    <span>{isExpanded ? "Hide Tracking Scans" : `View ${ship.trackingEvents.length} Tracking Scans`}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 pl-3 border-l-2 border-[#a95423]/40">
                      {ship.trackingEvents.map((evt) => (
                        <div key={evt.id} className="text-xs space-y-0.5">
                          <div className="flex items-center space-x-2 font-medium text-slate-800">
                            <span className="capitalize">{evt.status.replace(/_/g, " ")}</span>
                            {evt.location && <span className="text-slate-500 text-[11px]">({evt.location})</span>}
                            <span className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleString()}</span>
                          </div>
                          {evt.description && <p className="text-slate-600 text-[11px]">{evt.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancel Shipment Modal */}
      {cancelModalOpen && activeShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span>Cancel Active Shipment (Attempt #{activeShipment.attemptNumber})</span>
            </h3>

            {cancelError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{cancelError}</span>
              </div>
            )}

            {/* Check Delhivery Status Eligibility Warning */}
            {activeShipment.provider === "delhivery" && !checkDelhiveryCancelEligibility(activeShipment).eligible ? (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
                <p className="font-bold">Cancellation Ineligible per Delhivery Rules</p>
                <p>{checkDelhiveryCancelEligibility(activeShipment).reason}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Cancelling this active shipment will call the courier cancellation API, mark the shipment as cancelled, and <strong className="text-[#a95423]">revert order status back to Processing</strong> for immediate re-dispatch.
              </p>
            )}

            <form onSubmit={handleCancelShipment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cancellation Reason <span className="text-[#a95423]">* Required</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Customer requested address change before dispatch / Carrier issue..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  disabled={cancelling}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelling || (activeShipment.provider === "delhivery" && !checkDelhiveryCancelEligibility(activeShipment).eligible)}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm disabled:opacity-50 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    <span>Confirm Cancellation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Re-Dispatch Modal */}
      {redispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              <span>Re-Dispatch Order</span>
            </h3>

            {redispatchError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{redispatchError}</span>
              </div>
            )}

            <form onSubmit={handleRedispatch} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Re-Dispatch Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRedispatchProvider("delhivery")}
                    className={`py-2 px-3 rounded-lg border font-medium cursor-pointer transition ${
                      redispatchProvider === "delhivery" ? "bg-[#a95423] text-white border-[#a95423]" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Delhivery API
                  </button>
                  <button
                    type="button"
                    onClick={() => setRedispatchProvider("external")}
                    className={`py-2 px-3 rounded-lg border font-medium cursor-pointer transition ${
                      redispatchProvider === "external" ? "bg-[#a95423] text-white border-[#a95423]" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    External Courier
                  </button>
                </div>
              </div>

              {redispatchProvider === "external" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Carrier Name</label>
                    <input
                      type="text"
                      value={redispatchCarrier}
                      onChange={(e) => setRedispatchCarrier(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Manual Tracking URL *</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={redispatchTrackingUrl}
                      onChange={(e) => setRedispatchTrackingUrl(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Re-Dispatch *</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Previous attempt NDR / Address corrected..."
                  value={redispatchReason}
                  onChange={(e) => setRedispatchReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRedispatchModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  disabled={redispatching}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={redispatching}
                  className="px-4 py-2 font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {redispatching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Re-Dispatching...</span>
                    </>
                  ) : (
                    <span>Launch New Attempt</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
