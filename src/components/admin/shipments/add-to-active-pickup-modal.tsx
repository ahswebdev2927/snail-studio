"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  Package,
  CheckCircle2,
  Loader2,
  Building2,
  ShieldAlert,
  Info,
} from "lucide-react";

interface AddToActivePickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedShipmentIds: string[];
  activePickupInfo?: {
    id?: string;
    pickupId?: string | null;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    packageCount?: number;
    adminName?: string;
  } | null;
}

export function AddToActivePickupModal({
  isOpen,
  onClose,
  onSuccess,
  selectedShipmentIds = [],
  activePickupInfo,
}: AddToActivePickupModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOverLimit = selectedShipmentIds.length > 3;

  const handleConfirmAdd = async () => {
    setError(null);
    setSuccessMessage(null);

    if (selectedShipmentIds.length === 0) {
      setError("Please select at least 1 shipment to add.");
      return;
    }

    if (isOverLimit) {
      setError(
        "Cannot add more than 3 Shipments to an active/pending Pickup request, please request for another time or after the pickup request is resolved"
      );
      return;
    }

    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split("T")[0];
      const pickupDate = activePickupInfo?.scheduledDate || todayStr;

      const res = await fetch("/api/admin/shipments/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupDate,
          shipmentIds: selectedShipmentIds,
          isAddToActive: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to add shipments to active pickup request"
        );
      }

      setSuccessMessage(
        data.message ||
          `Successfully added ${selectedShipmentIds.length} shipment(s) to active pickup request.`
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(
        err.message || "An error occurred while adding shipments to pickup."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-xl ${
                isOverLimit
                  ? "bg-amber-100 text-amber-700"
                  : "bg-[#a95423]/10 text-[#a95423]"
              }`}
            >
              {isOverLimit ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <Package className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isOverLimit
                  ? "Pickup Limit Exceeded"
                  : "Add to Active Pickup Request"}
              </h3>
              <p className="text-xs text-slate-500">
                {isOverLimit
                  ? "Active Pickup Constraint Warning"
                  : `Active Request ID: ${activePickupInfo?.pickupId || "Active"}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Over-Limit Alert Dialog (When 4 or more shipments are selected) */}
        {isOverLimit ? (
          <div className="p-6 space-y-5">
            <div className="p-4 bg-amber-50 border border-amber-300/80 rounded-xl space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-950">
                    Cannot Add Selected Shipments
                  </h4>
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">
                    Cannot add more than 3 Shipments to an active/pending Pickup request, please request for another time or after the pickup request is resolved
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Selected Shipments Count:</span>
                <span className="font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  {selectedShipmentIds.length} Shipments
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Maximum Allowed per Active Request:</span>
                <span className="font-bold text-slate-800">3 Shipments</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm transition cursor-pointer text-center"
              >
                Understood & Close
              </button>
            </div>
          </div>
        ) : (
          /* Normal Confirmation Form (1 to 3 shipments selected) */
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start space-x-2 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center space-x-2 text-slate-800 font-semibold">
                <Info className="w-4 h-4 text-[#a95423]" />
                <span>Active Pickup Information</span>
              </div>

              <div className="space-y-1.5 pt-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Pickup ID:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {activePickupInfo?.pickupId || "Active Today"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Scheduled Date:</span>
                  <span className="font-medium text-slate-800">
                    {activePickupInfo?.scheduledDate || "Today"}
                  </span>
                </div>
                {activePickupInfo?.scheduledTime && (
                  <div className="flex justify-between">
                    <span>Pickup Window:</span>
                    <span className="font-medium text-slate-800">
                      {activePickupInfo.scheduledTime}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#a95423]/10 border border-[#a95423]/20 rounded-xl flex items-center justify-between text-xs font-semibold text-[#a95423]">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>
                  Adding {selectedShipmentIds.length} Shipment(s) to Batch
                </span>
              </div>
              <span className="px-2 py-0.5 bg-[#a95423] text-white text-[10px] font-bold rounded">
                MAX 3 CAP VALIDATED
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              These {selectedShipmentIds.length} shipment(s) will be associated
              with the active pickup request. Their status will transition to{" "}
              <strong className="text-slate-900">Pickup Scheduled</strong> for
              the Field Executive to scan.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={loading || selectedShipmentIds.length === 0}
                className="px-5 py-2.5 text-xs font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm disabled:opacity-50 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Request...</span>
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    <span>Add to Active Pickup Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
