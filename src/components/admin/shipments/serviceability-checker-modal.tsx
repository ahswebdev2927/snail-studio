"use client";

import React, { useState } from "react";
import { X, Search, ShieldCheck, AlertCircle, Loader2, CheckCircle2, MapPin } from "lucide-react";

interface ServiceabilityCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceabilityCheckerModal({ isOpen, onClose }: ServiceabilityCheckerModalProps) {
  const [pincode, setPincode] = useState("");
  const [weightGrams, setWeightGrams] = useState(500);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const cleanPincode = pincode.trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      setError("Please enter a valid 6-digit Indian postal pincode.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/shipments/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincode: cleanPincode,
          weightGrams: Number(weightGrams) || 500,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Serviceability check failed");
      }

      setResult(data.serviceability);
    } catch (err: any) {
      setError(err.message || "An error occurred while checking serviceability.");
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
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Check Pincode Serviceability</h3>
              <p className="text-xs text-slate-500">Delhivery API Live Lookup</p>
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
        <form onSubmit={handleCheck} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start space-x-2.5 text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Destination Pincode <span className="text-[#a95423]">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 500019"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#a95423] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Weight (Grams)</label>
              <input
                type="number"
                min="100"
                max="50000"
                value={weightGrams}
                onChange={(e) => setWeightGrams(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || pincode.length !== 6}
            className="w-full py-2.5 text-xs font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm disabled:opacity-50 transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Delhivery API...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Check Serviceability</span>
              </>
            )}
          </button>

          {/* Result View */}
          {result && (
            <div
              className={`p-4 rounded-xl border space-y-2 text-xs animate-in fade-in duration-150 ${
                result.isServiceable
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-sm">
                {result.isServiceable ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Pincode {result.pincode} is Serviceable</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <span>Pincode {result.pincode} is Non-Serviceable</span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-slate-700">
                <div>
                  <span className="text-slate-500 font-medium">Carrier Provider:</span> {result.courierName || "Delhivery"}
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Prepaid Available:</span>{" "}
                  {result.prepaidAvailable ? "Yes (Prepaid Only)" : "No"}
                </div>
                {result.estimatedDeliveryDays && (
                  <div>
                    <span className="text-slate-500 font-medium">Estimated Delivery:</span> {result.estimatedDeliveryDays} days
                  </div>
                )}
              </div>

              {result.remarks && (
                <p className="text-[11px] text-slate-600 pt-1">
                  <span className="font-semibold text-slate-700">Carrier Remarks:</span> {result.remarks}
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
