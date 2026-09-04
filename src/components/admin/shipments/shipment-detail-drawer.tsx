"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Truck,
  MapPin,
  Clock,
  Printer,
  XCircle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  FileText,
  User,
  Phone,
  Calendar,
  History,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { ALLOWED_DELHIVERY_CANCEL_STATUSES } from "@/lib/shipping/types";

interface ShipmentDetailDrawerProps {
  shipmentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenDispatchModal?: (orderId: string) => void;
}

export function ShipmentDetailDrawer({
  shipmentId,
  isOpen,
  onClose,
  onRefresh,
  onOpenDispatchModal,
}: ShipmentDetailDrawerProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal controls inside drawer
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [editExternalOpen, setEditExternalOpen] = useState(false);
  const [externalCourierName, setExternalCourierName] = useState("");
  const [externalTrackingNumber, setExternalTrackingNumber] = useState("");
  const [externalTrackingUrl, setExternalTrackingUrl] = useState("");
  const [updatingExternal, setUpdatingExternal] = useState(false);

  useEffect(() => {
    if (isOpen && shipmentId) {
      fetchDetail(shipmentId);
    }
  }, [isOpen, shipmentId]);

  const fetchDetail = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/shipments/${id}`);
      if (!res.ok) {
        throw new Error("Failed to load shipment details.");
      }
      const resData = await res.json();
      setData(resData);

      if (resData.shipment?.isExternal) {
        setExternalCourierName(resData.shipment.externalCourierName || resData.shipment.carrier || "");
        setExternalTrackingNumber(resData.shipment.trackingNumber || "");
        setExternalTrackingUrl(resData.shipment.trackingUrl || "");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching details.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const shipment = data?.shipment;
  const order = data?.order;
  const scans = data?.trackingEvents || [];
  const auditLogs = data?.auditLogs || [];

  const isActive = shipment && shipment.status !== "cancelled";

  const printLabel = async (size: "4R" | "A4") => {
    if (!order?.id) return;
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/label?pdfSize=${size}`);
      const labelData = await res.json();
      if (!res.ok || !labelData.success || !labelData.pdfUrl) {
        alert(labelData.error || "Failed to generate label PDF");
        return;
      }
      window.open(labelData.pdfUrl, "_blank");
    } catch (err: any) {
      alert(err.message || "Error opening label PDF");
    }
  };

  const handleCancelShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.id) return;
    setCancelError(null);

    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      setCancelError("A valid cancellation reason (minimum 3 characters) is required.");
      return;
    }

    try {
      setCancelling(true);
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to cancel shipment.");
      }

      setCancelModalOpen(false);
      setCancelReason("");
      fetchDetail(shipmentId!);
      onRefresh();
    } catch (err: any) {
      setCancelError(err.message || "An error occurred while cancelling.");
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateExternalCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment?.id) return;

    try {
      setUpdatingExternal(true);
      const res = await fetch(`/api/admin/shipments/${shipment.id}/external`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalCourierName: externalCourierName.trim(),
          trackingNumber: externalTrackingNumber.trim(),
          externalTrackingUrl: externalTrackingUrl.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to update external courier.");
      }

      setEditExternalOpen(false);
      fetchDetail(shipmentId!);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Error updating external courier details.");
    } finally {
      setUpdatingExternal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white border-l border-slate-200 text-slate-900 flex flex-col shadow-2xl">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#a95423]/10 text-[#a95423] rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <span>Shipment #{shipment?.trackingNumber || shipmentId}</span>
                </h3>
                <p className="text-xs text-slate-500">Order ID: #{shipment?.orderId || "N/A"}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#a95423]" />
                <p className="text-xs">Loading shipment record details...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            ) : shipment ? (
              <>
                {/* Status & Carrier Overview Card */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center space-x-3">
                      <span className="px-2.5 py-1 text-xs font-bold bg-[#a95423]/10 text-[#a95423] border border-[#a95423]/20 rounded-lg">
                        Attempt #{shipment.attemptNumber || 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <span>{shipment.carrier || "Delhivery"}</span>
                          {shipment.isExternal && (
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                              External Courier
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                          Courier Order ID: {shipment.courierOrderId}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${
                        shipment.status === "delivered"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : shipment.status === "cancelled"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {shipment.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Waybill / Tracking:</span>
                      <span className="font-mono font-bold text-[#a95423]">{shipment.trackingNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Serviceability Log:</span>
                      <span className="capitalize font-medium text-emerald-700">
                        {shipment.serviceabilityStatus || "Verified"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Created Timestamp:</span>
                      <span>{new Date(shipment.createdAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Estimated Delivery:</span>
                      <span>
                        {shipment.estimatedDeliveryAt
                          ? new Date(shipment.estimatedDeliveryAt).toLocaleDateString()
                          : "Standard 3-5 Days"}
                      </span>
                    </div>
                  </div>

                  {shipment.trackingUrl && (
                    <div className="pt-2 border-t border-slate-200 text-xs">
                      <span className="text-slate-400 block mb-1">Public Tracking Link:</span>
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#a95423] hover:underline font-medium flex items-center space-x-1 truncate max-w-md"
                      >
                        <span className="truncate">{shipment.trackingUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Actions Bar inside Card */}
                  {isActive && (
                    <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                      {shipment.provider === "delhivery" && (
                        <>
                          <button
                            onClick={() => printLabel("4R")}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#a95423]" />
                            <span>Print 4R Label</span>
                          </button>
                          <button
                            onClick={() => printLabel("A4")}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#a95423]" />
                            <span>Print A4 Label</span>
                          </button>
                        </>
                      )}

                      {shipment.isExternal && (
                        <button
                          onClick={() => setEditExternalOpen(true)}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span>Edit External Details</span>
                        </button>
                      )}

                      <button
                        onClick={() => setCancelModalOpen(true)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition flex items-center space-x-1.5 ml-auto cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Shipment</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Delivery Address & Lock Badge */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-[#a95423]" />
                      <span>Delivery Address</span>
                    </h5>

                    <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center space-x-1">
                      <span>🔒 Address Locked: Waybill Active</span>
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600">
                    <p className="font-bold text-slate-900">{shipment.customerName}</p>
                    <p>{shipment.customerPhone}</p>
                    {shipment.shippingAddress && (
                      <>
                        <p>{shipment.shippingAddress.addressLine1}</p>
                        {shipment.shippingAddress.addressLine2 && <p>{shipment.shippingAddress.addressLine2}</p>}
                        <p>
                          {shipment.shippingAddress.city}, {shipment.shippingAddress.state} -{" "}
                          <span className="font-mono font-bold text-slate-900">{shipment.shippingAddress.postalCode}</span>
                        </p>
                        <p>{shipment.shippingAddress.country}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Tracking Scans Timeline */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                    <Clock className="w-4 h-4 text-[#a95423]" />
                    <span>Tracking Scan Timeline ({scans.length})</span>
                  </h5>

                  {scans.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No tracking scans recorded yet.</p>
                  ) : (
                    <div className="space-y-3 pl-2 border-l-2 border-[#a95423]/40 pt-1">
                      {scans.map((evt: any) => (
                        <div key={evt.id} className="text-xs space-y-0.5 relative pl-4">
                          <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-[#a95423] border-2 border-white" />
                          <div className="flex items-center justify-between font-medium text-slate-800">
                            <span className="capitalize">{evt.status.replace(/_/g, " ")}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(evt.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {evt.location && <p className="text-slate-500 text-[11px]">Location: {evt.location}</p>}
                          {evt.description && <p className="text-slate-600 text-[11px]">{evt.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shipment Operational Audit History */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-200 pb-2.5">
                    <History className="w-4 h-4 text-[#a95423]" />
                    <span>Audit Trail Log ({auditLogs.length})</span>
                  </h5>

                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">No administrative audit entries logged yet.</p>
                  ) : (
                    <div className="space-y-2.5 divide-y divide-slate-200">
                      {auditLogs.map((log: any) => (
                        <div key={log.id} className="pt-2 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="font-bold text-[#a95423] capitalize">{log.action.replace(/_/g, " ")}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">By: {log.adminName}</p>
                          {log.notes && <p className="text-[11px] text-slate-600 leading-normal">{log.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold flex items-center space-x-2 text-slate-900">
              <XCircle className="w-5 h-5 text-red-600" />
              <span>Confirm Shipment Cancellation</span>
            </h4>

            {cancelError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{cancelError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600">
              Cancelling this shipment will send a cancel instruction to the carrier and revert the order state to Processing for re-dispatch.
            </p>

            <form onSubmit={handleCancelShipment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cancellation Reason <span className="text-[#a95423]">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Admin cancelled due to carrier issue..."
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
                  disabled={cancelling}
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

      {/* Edit External Details Modal */}
      {editExternalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold flex items-center space-x-2 text-slate-900">
              <FileText className="w-5 h-5 text-amber-600" />
              <span>Edit External Courier Info</span>
            </h4>

            <form onSubmit={handleUpdateExternalCourier} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Carrier Name</label>
                <input
                  type="text"
                  value={externalCourierName}
                  onChange={(e) => setExternalCourierName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tracking / Waybill #</label>
                <input
                  type="text"
                  value={externalTrackingNumber}
                  onChange={(e) => setExternalTrackingNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Public Tracking URL</label>
                <input
                  type="url"
                  value={externalTrackingUrl}
                  onChange={(e) => setExternalTrackingUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditExternalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  disabled={updatingExternal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updatingExternal}
                  className="px-4 py-2 font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {updatingExternal ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
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
