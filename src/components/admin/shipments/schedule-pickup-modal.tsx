"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  Package,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building2,
  Info,
  Lock,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";

interface SchedulePickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedShipmentIds?: string[];
}

export function SchedulePickupModal({
  isOpen,
  onClose,
  onSuccess,
  selectedShipmentIds = [],
}: SchedulePickupModalProps) {
  // Format today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];

  const [pickupDate, setPickupDate] = useState(todayStr);
  const [pickupTime, setPickupTime] = useState("14:00:00");
  const [packageCount, setPackageCount] = useState(
    selectedShipmentIds.length > 0 ? selectedShipmentIds.length : 1
  );

  // Active pickup check state
  const [checkingActive, setCheckingActive] = useState(true);
  const [activePickupInfo, setActivePickupInfo] = useState<any>(null);
  const [unlockedByAdmin, setUnlockedByAdmin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync count when selectedShipmentIds prop changes
  useEffect(() => {
    if (selectedShipmentIds.length > 0) {
      setPackageCount(selectedShipmentIds.length);
    }
  }, [selectedShipmentIds]);

  // Check active pickup when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function checkStatus() {
      try {
        setCheckingActive(true);
        const res = await fetch("/api/admin/shipments/pickup");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.activePickupExists) {
            setActivePickupInfo(data.latestPickup);
          } else if (isMounted) {
            setActivePickupInfo(null);
          }
        }
      } catch (err) {
        console.error("Failed to check active pickup status:", err);
      } finally {
        if (isMounted) setCheckingActive(false);
      }
    }

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!pickupDate) {
      setError("Pickup date is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/shipments/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupDate,
          pickupTime,
          packageCount: selectedShipmentIds.length > 0 ? selectedShipmentIds.length : Number(packageCount) || 1,
          shipmentIds: selectedShipmentIds.length > 0 ? selectedShipmentIds : undefined,
          bypassActiveLock: unlockedByAdmin,
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data.activePickupExists) {
        setActivePickupInfo(data.latestPickup);
        setUnlockedByAdmin(false);
        setError("An active pickup request already exists for today.");
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to schedule pickup");
      }

      const countMsg = data.scheduledCount || selectedShipmentIds.length || packageCount;
      setSuccessMessage(data.message || `Pickup scheduled successfully for ${countMsg} package(s).`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred while scheduling pickup.");
    } finally {
      setLoading(false);
    }
  };

  // If active pickup exists and admin hasn't confirmed completion, show verification prompt modal
  const showVerificationModal = Boolean(activePickupInfo && !unlockedByAdmin && !checkingActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#a95423]/10 text-[#a95423] rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Schedule Delhivery Pickup</h3>
              <p className="text-xs text-slate-500">Request Warehouse Package Pickup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {checkingActive ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 text-[#a95423] animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Checking active warehouse pickup status...</p>
          </div>
        ) : showVerificationModal ? (
          /* Active Pickup Verification Modal Screen */
          <div className="p-6 space-y-5">
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-3">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Active Pickup Request Already Scheduled</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Delhivery enforces a rule of **1 active pickup request per warehouse location per day**.
                  </p>
                </div>
              </div>

              {activePickupInfo && (
                <div className="bg-white/80 p-3 rounded-lg border border-amber-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pickup ID:</span>
                    <span className="font-mono font-bold text-slate-800">{activePickupInfo.pickupId || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled Date & Time:</span>
                    <span className="font-semibold text-slate-800">
                      {activePickupInfo.scheduledDate} ({activePickupInfo.scheduledTime})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled By:</span>
                    <span className="font-medium text-slate-800">{activePickupInfo.adminName || "Admin"}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs">
                <HelpCircle className="w-4 h-4 text-[#a95423]" />
                <span>Admin Verification Prompt:</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Has the previous pickup request been completed by Delhivery (Are the packages already picked up by the Field Executive)?
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                No, Keep Locked
              </button>

              <button
                type="button"
                onClick={() => setUnlockedByAdmin(true)}
                className="px-5 py-2.5 text-xs font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm transition flex items-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Yes, Pickup Completed (Unlock Request)</span>
              </button>
            </div>
          </div>
        ) : (
          /* Standard Schedule Pickup Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start space-x-2.5 text-xs">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start space-x-2.5 text-xs">
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Admin Guidance Callout Banner */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 space-y-2 text-xs">
              <div className="flex items-center space-x-2 font-bold text-amber-950">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Delhivery Pickup Operational Rules</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 font-medium pl-1">
                <li>
                  <strong className="font-semibold">Warehouse Location-Level:</strong> Request applies to the entire configured warehouse location (`DELHIVERY_PICKUP_LOCATION`).
                </li>
                <li>
                  <strong className="font-semibold">Once-Daily Limit:</strong> 1 active pickup request per warehouse per day.
                </li>
                <li>
                  <strong className="font-semibold">Parcel Timing:</strong> Raise request only when parcels are packed and in <span className="underline decoration-amber-400 font-bold">Ready to Pickup</span> status.
                </li>
              </ul>
            </div>

            {/* Selected Shipments Badge indicator if opened from multi-select */}
            {selectedShipmentIds.length > 0 && (
              <div className="p-3 bg-[#a95423]/10 border border-[#a95423]/20 text-[#a95423] rounded-xl flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 shrink-0" />
                  <span>Batch Request for {selectedShipmentIds.length} Selected Parcel(s)</span>
                </div>
                <span className="px-2 py-0.5 bg-[#a95423] text-white text-[10px] font-bold rounded">
                  BATCHED
                </span>
              </div>
            )}

            {/* Read-Only Warehouse Pickup Location from ENV */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building2 className="w-4 h-4 text-[#a95423] shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Pickup Location (Warehouse)
                  </span>
                  <span className="text-xs font-semibold text-slate-800">Configured Warehouse</span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-200 text-slate-700 border border-slate-300 rounded">
                DELHIVERY_PICKUP_LOCATION
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pickup Date <span className="text-[#a95423]">*</span>
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pickup Window</label>
                <select
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white cursor-pointer"
                >
                  <option value="10:00:00">10:00 AM (Morning Slot)</option>
                  <option value="14:00:00">02:00 PM (Afternoon Slot)</option>
                  <option value="17:00:00">05:00 PM (Evening Slot)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Expected Package Count <span className="text-[#a95423]">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={selectedShipmentIds.length > 0 ? selectedShipmentIds.length : packageCount}
                onChange={(e) => setPackageCount(Number(e.target.value))}
                disabled={selectedShipmentIds.length > 0}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white disabled:opacity-75 disabled:bg-slate-100"
                required
              />
              {selectedShipmentIds.length > 0 && (
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Locked to selected table rows ({selectedShipmentIds.length} parcels).
                </span>
              )}
            </div>

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
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm disabled:opacity-50 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scheduling...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>Schedule Pickup</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
