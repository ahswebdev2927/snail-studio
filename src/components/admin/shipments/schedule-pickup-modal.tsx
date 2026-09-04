"use client";

import React, { useState } from "react";
import { X, Calendar, Clock, Package, AlertCircle, Loader2, CheckCircle2, Building2 } from "lucide-react";

interface SchedulePickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SchedulePickupModal({ isOpen, onClose, onSuccess }: SchedulePickupModalProps) {
  // Format today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];

  const [pickupDate, setPickupDate] = useState(todayStr);
  const [pickupTime, setPickupTime] = useState("14:00:00");
  const [packageCount, setPackageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          packageCount: Number(packageCount) || 1,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to schedule pickup");
      }

      setSuccessMessage(data.message || `Pickup scheduled successfully for ${packageCount} package(s).`);
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

        {/* Content */}
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

          {/* Read-Only Warehouse Pickup Location from ENV */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building2 className="w-4 h-4 text-[#a95423] shrink-0" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Pickup Location (Environment)
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
              value={packageCount}
              onChange={(e) => setPackageCount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white"
              required
            />
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
      </div>
    </div>
  );
}
