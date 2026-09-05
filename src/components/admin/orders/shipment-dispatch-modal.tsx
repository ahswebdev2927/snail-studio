"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Truck,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Check,
  CheckCircle2,
  MapPin,
  Package,
  FileText,
  ArrowRight,
  ArrowLeft,
  Lock,
} from "lucide-react";

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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [provider, setProvider] = useState<"delhivery" | "external">("delhivery");

  // Step 1: Address Review State
  const [addressDetails, setAddressDetails] = useState<any | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Step 2: Serviceability State
  const [serviceabilityResult, setServiceabilityResult] = useState<any | null>(null);
  const [checkingServiceability, setCheckingServiceability] = useState(false);

  // Step 3: Package Inputs (Category C + Smart Defaults)
  const [weightGrams, setWeightGrams] = useState(250);
  const [lengthCm, setLengthCm] = useState(15.0);
  const [widthCm, setWidthCm] = useState(10.0);
  const [heightCm, setHeightCm] = useState(5.0);
  const [transportSpeed, setTransportSpeed] = useState<"D" | "F">("D");
  const [labelFormat, setLabelFormat] = useState<"4R" | "A4">("4R");
  const [fragile, setFragile] = useState(true);
  const [plasticPackaging, setPlasticPackaging] = useState(false);
  const [sellerInvoice, setSellerInvoice] = useState(orderId);

  // External Courier Inputs
  const [carrier, setCarrier] = useState("DTDC");
  const [customCarrierName, setCustomCarrierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [externalTrackingUrl, setExternalTrackingUrl] = useState("");
  const [externalMetadata, setExternalMetadata] = useState("");

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setSellerInvoice(orderId);
      fetchOrderAddress();
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const isDifferencePending = shippingDifferenceStatus === "pending";

  async function fetchOrderAddress() {
    try {
      setLoadingAddress(true);
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        const orderData = data.order || data;
        const shippingAddr =
          orderData.addresses?.find((a: any) => a.type === "shipping") ||
          orderData.addresses?.[0];
        setAddressDetails(shippingAddr || null);

        // Pre-select transport speed based on shipping method chosen at checkout if available
        if (orderData.shippingMethod?.toLowerCase().includes("express")) {
          setTransportSpeed("F");
        } else {
          setTransportSpeed("D");
        }
      }
    } catch {
      // Fallback silently if fetch fails
    } finally {
      setLoadingAddress(false);
    }
  }

  const runServiceabilityCheck = async () => {
    setError(null);
    const targetPincode = (
      addressDetails?.postalCode ||
      customerPincode ||
      ""
    ).trim();

    if (!/^\d{6}$/.test(targetPincode)) {
      setError("Order shipping pincode is missing or invalid (6-digit Indian postal code required).");
      return;
    }

    try {
      setCheckingServiceability(true);
      const res = await fetch("/api/admin/shipments/serviceability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pincode: targetPincode,
          weightGrams,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Serviceability check failed");
      }

      setServiceabilityResult(data.serviceability);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "An error occurred while checking serviceability.");
    } finally {
      setCheckingServiceability(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isDifferencePending) {
      setError("Cannot generate shipment: Customer has a pending shipping fee adjustment payment.");
      return;
    }

    if (provider === "external" && !trackingNumber.trim()) {
      setError("Waybill / Tracking Number is required for external couriers.");
      return;
    }

    try {
      setLoading(true);
      const finalCarrier =
        carrier === "Other" ? customCarrierName || "External Courier" : carrier;

      const payload = {
        provider,
        carrier: provider === "external" ? finalCarrier : "Delhivery",
        externalCourierName: provider === "external" ? finalCarrier : undefined,
        trackingNumber: provider === "external" ? trackingNumber.trim() : undefined,
        externalTrackingUrl: provider === "external" ? externalTrackingUrl.trim() || undefined : undefined,
        externalMetadata: provider === "external" ? externalMetadata.trim() || undefined : undefined,
        adminOptions: {
          weightGrams: Number(weightGrams) || 250,
          lengthCm: Number(lengthCm) || 15.0,
          widthCm: Number(widthCm) || 10.0,
          heightCm: Number(heightCm) || 5.0,
          fragileShipment: fragile,
          plasticPackaging,
          transportSpeed,
          labelFormat,
          sellerInvoiceNumber: sellerInvoice,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header with Step Indicator */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#a95423]/10 text-[#a95423] rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Shipment Creation Wizard</h3>
              <p className="text-xs text-slate-500">Order #{orderId} • Step {step} of 4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Bar */}
        <div className="grid grid-cols-4 text-center border-b border-slate-200 bg-white text-[11px] font-semibold">
          <div className={`py-2 border-r border-slate-100 ${step === 1 ? "bg-[#a95423]/10 text-[#a95423]" : "text-slate-400"}`}>
            1. Destination Review
          </div>
          <div className={`py-2 border-r border-slate-100 ${step === 2 ? "bg-[#a95423]/10 text-[#a95423]" : "text-slate-400"}`}>
            2. Serviceability Check
          </div>
          <div className={`py-2 border-r border-slate-100 ${step === 3 ? "bg-[#a95423]/10 text-[#a95423]" : "text-slate-400"}`}>
            3. Package Details
          </div>
          <div className={`py-2 ${step === 4 ? "bg-[#a95423]/10 text-[#a95423]" : "text-slate-400"}`}>
            4. Review & Confirm
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start space-x-3 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {isDifferencePending && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start space-x-3 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold">Pending Shipping Adjustment</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  The customer has a pending shipping difference payment. Shipment creation is blocked until settled or waived.
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: DESTINATION REVIEW */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-[#a95423]" />
                <span>Destination Address Review</span>
              </div>

              {loadingAddress ? (
                <div className="p-8 flex justify-center items-center text-xs text-slate-500 space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#a95423]" />
                  <span>Loading order address details...</span>
                </div>
              ) : addressDetails ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{addressDetails.name}</p>
                      <p className="text-slate-500">Phone: {addressDetails.phone}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-semibold uppercase">
                      {addressDetails.type || "Shipping"} Address
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-0.5 text-slate-700">
                    <p>{addressDetails.addressLine1}</p>
                    {addressDetails.addressLine2 && <p>{addressDetails.addressLine2}</p>}
                    <p className="font-semibold text-slate-900">
                      {addressDetails.city}, {addressDetails.state} - {addressDetails.postalCode}
                    </p>
                    <p className="text-slate-500">{addressDetails.country || "India"}</p>
                  </div>

                  <div className="pt-2 flex items-center space-x-2 text-[11px] text-amber-700 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 mt-3">
                    <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>AWB Address Lock will activate upon shipment generation. Address changes will be locked permanently.</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                  Pincode: <strong>{customerPincode || "Not found"}</strong>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={checkingServiceability || isDifferencePending}
                  onClick={runServiceabilityCheck}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm disabled:opacity-50 transition flex items-center space-x-2 cursor-pointer"
                >
                  {checkingServiceability ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking Pincode API...</span>
                    </>
                  ) : (
                    <>
                      <span>Check Serviceability</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PINCODE SERVICEABILITY CHECK RESULT */}
          {step === 2 && serviceabilityResult && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#a95423]" />
                <span>Pincode Serviceability Outcome</span>
              </div>

              {serviceabilityResult.isServiceable ? (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 space-y-3 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Pincode {serviceabilityResult.pincode} is Serviceable by Delhivery</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-200 text-slate-700">
                    <div>
                      <span className="text-slate-500 font-medium">Carrier Provider:</span> Delhivery B2C
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Payment Mode:</span> Prepaid Only
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Shipping Modes:</span> Surface / Express
                    </div>
                    {serviceabilityResult.estimatedDeliveryDays && (
                      <div>
                        <span className="text-slate-500 font-medium">Est. TAT:</span> {serviceabilityResult.estimatedDeliveryDays} Days
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-3 text-xs">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Pincode {serviceabilityResult.pincode} is NOT Serviceable by Delhivery</span>
                  </div>
                  <p className="text-slate-700">
                    Delhivery B2C automated shipping is unavailable for destination pincode <strong>{serviceabilityResult.pincode}</strong>.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProvider("external");
                        setStep(3);
                      }}
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg shadow-sm flex items-center space-x-2 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Switch to External / Manual Courier Dispatch</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Provider Selection Tabs */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl border border-slate-200 pt-2">
                <button
                  type="button"
                  onClick={() => setProvider("delhivery")}
                  disabled={!serviceabilityResult.isServiceable}
                  className={`py-2.5 px-4 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-2 cursor-pointer ${
                    provider === "delhivery"
                      ? "bg-[#a95423] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  } ${!serviceabilityResult.isServiceable ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Delhivery Automated API</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider("external")}
                  className={`py-2.5 px-4 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-2 cursor-pointer ${
                    provider === "external"
                      ? "bg-[#a95423] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>External Courier (Manual)</span>
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Address</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer"
                >
                  <span>Continue to Package Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PACKAGE DETAILS & PARAMETERS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Package className="w-4 h-4 text-[#a95423]" />
                <span>Package Parameters & Defaults</span>
              </div>

              {provider === "delhivery" ? (
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Package Weight (Grams)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="50000"
                        value={weightGrams}
                        onChange={(e) => setWeightGrams(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423]"
                        required
                      />
                      <p className="text-[10px] text-slate-500 mt-0.5">Default: 250g for Press-On Nail set</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Transport Speed
                      </label>
                      <select
                        value={transportSpeed}
                        onChange={(e) => setTransportSpeed(e.target.value as "D" | "F")}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] cursor-pointer"
                      >
                        <option value="D">Surface (Regular TAT - Code "D")</option>
                        <option value="F">Express (Next Day/NDD - Code "F")</option>
                      </select>
                      <p className="text-[10px] text-slate-500 mt-0.5">Derived from customer checkout selection</p>
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Package Dimensions (Length × Width × Height in cm)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500">Length (cm)</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          value={lengthCm}
                          onChange={(e) => setLengthCm(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#a95423]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Width (cm)</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          value={widthCm}
                          onChange={(e) => setWidthCm(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#a95423]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Height (cm)</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          value={heightCm}
                          onChange={(e) => setHeightCm(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#a95423]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Label Format Selection */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Shipping Label Format (PDF)
                      </label>
                      <select
                        value={labelFormat}
                        onChange={(e) => setLabelFormat(e.target.value as "4R" | "A4")}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] cursor-pointer font-medium"
                      >
                        <option value="4R">4R Format (4" x 6" Thermal Label - Default)</option>
                        <option value="A4">A4 Format (8.5" x 11" Standard Sheet)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Seller Invoice Reference
                      </label>
                      <input
                        type="text"
                        value={sellerInvoice}
                        onChange={(e) => setSellerInvoice(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423]"
                      />
                    </div>
                  </div>

                  {/* Handling Checkboxes */}
                  <div className="flex items-center space-x-6 pt-2 border-t border-slate-200">
                    <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={fragile}
                        onChange={(e) => setFragile(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#a95423] focus:ring-[#a95423]"
                      />
                      <span>Fragile Packaging (Handled with care)</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={plasticPackaging}
                        onChange={(e) => setPlasticPackaging(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#a95423] focus:ring-[#a95423]"
                      />
                      <span>Plastic Flybag Packaging</span>
                    </label>
                  </div>
                </div>
              ) : (
                /* External Courier Form */
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Courier Carrier</label>
                      <select
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] cursor-pointer"
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
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Custom Courier Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Local Express"
                          value={customCarrierName}
                          onChange={(e) => setCustomCarrierName(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423]"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Waybill / Tracking Number <span className="text-[#a95423]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. D123456789"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Manual Tracking URL <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.dtdc.in/tracking/..."
                      value={externalTrackingUrl}
                      onChange={(e) => setExternalTrackingUrl(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423]"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Provide web tracking link if available for customer convenience.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Dispatch Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Optional notes or vehicle details..."
                      value={externalMetadata}
                      onChange={(e) => setExternalMetadata(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#a95423] resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Serviceability</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm flex items-center space-x-2 cursor-pointer"
                >
                  <span>Review Shipment Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SHIPMENT REVIEW & CONFIRMATION */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-[#a95423]" />
                <span>Pre-Submission Shipment Summary</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900 text-sm">Order ID: #{orderId}</span>
                  <span className="px-2.5 py-1 bg-[#a95423]/10 text-[#a95423] font-bold rounded-lg uppercase">
                    Provider: {provider === "delhivery" ? "Delhivery B2C" : carrier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-500 block">Destination Pincode:</span>
                    <span className="font-semibold text-slate-900">{addressDetails?.postalCode || customerPincode || "N/A"}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Package Weight:</span>
                    <span className="font-semibold text-slate-900">{weightGrams}g</span>
                  </div>

                  {provider === "delhivery" && (
                    <>
                      <div>
                        <span className="text-slate-500 block">Dimensions (L × W × H):</span>
                        <span className="font-semibold text-slate-900">{lengthCm} × {widthCm} × {heightCm} cm</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Transport Speed:</span>
                        <span className="font-semibold text-slate-900">{transportSpeed === "F" ? "Express (NDD)" : "Surface (Regular)"}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Label PDF Format:</span>
                        <span className="font-semibold text-[#a95423]">{labelFormat === "4R" ? "4R Thermal Label (4x6)" : "A4 Sheet (8x11)"}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Packaging Flags:</span>
                        <span className="font-semibold text-slate-900">
                          {fragile ? "Fragile ✓" : "Standard"} {plasticPackaging ? "| Plastic Flybag" : ""}
                        </span>
                      </div>
                    </>
                  )}

                  {provider === "external" && (
                    <>
                      <div>
                        <span className="text-slate-500 block">Tracking Number:</span>
                        <span className="font-semibold text-slate-900">{trackingNumber || "N/A"}</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block">Tracking Link:</span>
                        <span className="font-semibold text-slate-900 truncate block">
                          {externalTrackingUrl || "Not Provided"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  Clicking <strong>Confirm Dispatch</strong> will create the AWB record and lock the shipping address.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Package Details</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={loading || isDifferencePending}
                  className="px-6 py-2.5 text-xs font-semibold bg-[#a95423] hover:bg-[#94451b] text-white rounded-xl shadow-sm disabled:opacity-50 transition flex items-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating AWB & Label...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Create Shipment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
