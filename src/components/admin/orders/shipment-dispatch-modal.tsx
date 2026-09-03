"use client";

import React, { useState } from "react";
import { X, Truck, ExternalLink, AlertTriangle, ShieldCheck, Loader2, Check } from "lucide-react";

interface ShipmentDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  customerPincode?: string;
  shippingDifferenceStatus?: string;
  onSuccess: () => void;
}

export function ShipmentDispatchModal({
  isOpen,
  onClose,
  orderId,
  customerPincode,
  shippingDifferenceStatus,
  onSuccess,
}: ShipmentDispatchModalProps) {
  const [provider, setProvider] = useState<"delhivery" | "external">("delhivery");
  const [carrier, setCarrier] = useState("DTDC");
  const [customCarrierName, setCustomCarrierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [externalTrackingUrl, setExternalTrackingUrl] = useState("");
  const [externalMetadata, setExternalMetadata] = useState("");
  const [weightGrams, setWeightGrams] = useState(500);
  const [fragile, setFragile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDifferencePending = shippingDifferenceStatus === "pending";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isDifferencePending) {
      setError("Cannot generate shipment: Customer has a pending shipping fee adjustment payment.");
      return;
    }

    if (provider === "external") {
      if (!externalTrackingUrl.trim()) {
        setError("Manual Tracking URL is required for external courier dispatches.");
        return;
      }
      if (!trackingNumber.trim()) {
        setError("Waybill / Tracking Number is required for external couriers.");
        return;
      }
    }

    try {
      setLoading(true);
      const finalCarrier = carrier === "Other" ? (customCarrierName || "External Courier") : carrier;

      const payload = {
        provider,
        carrier: provider === "external" ? finalCarrier : "Delhivery",
        externalCourierName: provider === "external" ? finalCarrier : undefined,
        trackingNumber: provider === "external" ? trackingNumber.trim() : undefined,
        externalTrackingUrl: provider === "external" ? externalTrackingUrl.trim() : undefined,
        externalMetadata: provider === "external" ? externalMetadata.trim() : undefined,
        adminOptions: {
          weightGrams: Number(weightGrams) || 500,
          fragileShipment: fragile,
        },
      };

      const res = await fetch(`/api/admin/orders/${orderId}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch shipment");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during dispatch creation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 border border-neutral-800 text-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pink-500/10 text-pink-400 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-100">Dispatch Order Shipment</h3>
              <p className="text-xs text-neutral-400">Order ID: #{orderId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-start space-x-3 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isDifferencePending && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl flex items-start space-x-3 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Pending Shipping Adjustment</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  The customer has a pending shipping difference payment. Shipment creation is blocked until settled or waived.
                </p>
              </div>
            </div>
          )}

          {/* Provider Selection Tabs */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setProvider("delhivery")}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center space-x-2 ${
                provider === "delhivery"
                  ? "bg-pink-600 text-white shadow-lg"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Delhivery Automated API</span>
            </button>

            <button
              type="button"
              onClick={() => setProvider("external")}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center space-x-2 ${
                provider === "external"
                  ? "bg-pink-600 text-white shadow-lg"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>External Courier (Manual)</span>
            </button>
          </div>

          {/* Delhivery API Form Options */}
          {provider === "delhivery" && (
            <div className="space-y-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/60">
              <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-neutral-800">
                <span>Courier Service: Delhivery Surface / Express</span>
                <span>Destination Pincode: {customerPincode || "Verified"}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Package Weight (Grams)</label>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center space-x-2 cursor-pointer text-sm text-neutral-300">
                    <input
                      type="checkbox"
                      checked={fragile}
                      onChange={(e) => setFragile(e.target.checked)}
                      className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-pink-600 focus:ring-pink-500"
                    />
                    <span>Mark as Fragile Packaging</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* External Courier Form Options */}
          {provider === "external" && (
            <div className="space-y-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/60">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Courier Carrier</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="DTDC">DTDC Express</option>
                    <option value="BlueDart">BlueDart</option>
                    <option value="India Post">India Post / Speed Post</option>
                    <option value="Porter">Porter / Local Runner</option>
                    <option value="Professional">The Professional Couriers</option>
                    <option value="Other">Other Custom Courier</option>
                  </select>
                </div>

                {carrier === "Other" && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">Custom Courier Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Local Courier Service"
                      value={customCarrierName}
                      onChange={(e) => setCustomCarrierName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">Waybill / Tracking Number</label>
                  <input
                    type="text"
                    placeholder="e.g. D123456789"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Manual Tracking URL <span className="text-pink-400">* Required</span>
                </label>
                <input
                  type="url"
                  placeholder="https://www.dtdc.in/tracking/tracking_results.asp?TknNo=..."
                  value={externalTrackingUrl}
                  onChange={(e) => setExternalTrackingUrl(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                  required
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Enter the direct public URL where the customer can view live shipment tracking.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">Dispatch Notes / Vehicle Details</label>
                <textarea
                  rows={2}
                  placeholder="Optional dispatch notes or driver details..."
                  value={externalMetadata}
                  onChange={(e) => setExternalMetadata(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || isDifferencePending}
              className="px-5 py-2 text-sm font-medium bg-pink-600 hover:bg-pink-500 text-white rounded-xl shadow-lg shadow-pink-600/20 disabled:opacity-50 transition flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm Dispatch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
