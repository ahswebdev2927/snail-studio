"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, CheckCircle2, AlertCircle, MapPin, Sliders, DollarSign, Globe, Truck } from "lucide-react";

type TabName = "general" | "address" | "adjustments" | "rates" | "courier";

export default function ShippingSettingsPage() {
  // Tab State
  const [activeTab, setActiveTab] = useState<TabName>("general");

  // Form State
  const [shippingAdjustmentEnabled, setShippingAdjustmentEnabled] = useState(true);
  const [shippingAdjustmentMode, setShippingAdjustmentMode] = useState<"automatic" | "manual" | "disabled">("automatic");
  const [ignoreShippingDifference, setIgnoreShippingDifference] = useState(true);
  const [ignoreDifferenceAmount, setIgnoreDifferenceAmount] = useState("50");
  const [shippingPaymentMode, setShippingPaymentMode] = useState<"razorpay" | "offline" | "absorb">("razorpay");
  const [shippingRefundMode, setShippingRefundMode] = useState<"refund" | "store_credit" | "ignore" | "manual">("ignore");

  const [customerAddressEditUntil, setCustomerAddressEditUntil] = useState<"pending" | "paid" | "confirmed" | "processing" | "never">("processing");
  const [adminCanEditAfterAwb, setAdminCanEditAfterAwb] = useState(false);
  const [autoRegenerateAwb, setAutoRegenerateAwb] = useState(true);

  const [defaultPrepaidShipping, setDefaultPrepaidShipping] = useState("70");
  const [defaultCodShipping, setDefaultCodShipping] = useState("100");
  const [shippingRateProvider, setShippingRateProvider] = useState<"flat_rate" | "zone_rules" | "courier_api">("flat_rate");
  const [shippingFallbackMode, setShippingFallbackMode] = useState<"default_charges" | "manual_review">("default_charges");

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        
        // Helper to parse boolean from string
        const parseBool = (val: any, def: boolean) => {
          if (val === undefined || val === null) return def;
          return val === "true" || val === "1" || val === true;
        };

        if (data.shippingAdjustmentEnabled !== undefined) setShippingAdjustmentEnabled(parseBool(data.shippingAdjustmentEnabled, true));
        if (data.shippingAdjustmentMode) setShippingAdjustmentMode(data.shippingAdjustmentMode);
        if (data.ignoreShippingDifference !== undefined) setIgnoreShippingDifference(parseBool(data.ignoreShippingDifference, true));
        if (data.ignoreDifferenceAmount) setIgnoreDifferenceAmount(data.ignoreDifferenceAmount);
        if (data.shippingPaymentMode) setShippingPaymentMode(data.shippingPaymentMode);
        if (data.shippingRefundMode) setShippingRefundMode(data.shippingRefundMode);

        if (data.customerAddressEditUntil) setCustomerAddressEditUntil(data.customerAddressEditUntil);
        if (data.adminCanEditAfterAwb !== undefined) setAdminCanEditAfterAwb(parseBool(data.adminCanEditAfterAwb, false));
        if (data.autoRegenerateAwb !== undefined) setAutoRegenerateAwb(parseBool(data.autoRegenerateAwb, true));

        if (data.defaultPrepaidShipping) setDefaultPrepaidShipping(data.defaultPrepaidShipping);
        if (data.defaultCodShipping) setDefaultCodShipping(data.defaultCodShipping);
        if (data.shippingRateProvider) setShippingRateProvider(data.shippingRateProvider);
        if (data.shippingFallbackMode) setShippingFallbackMode(data.shippingFallbackMode);
      } else {
        showStatus("error", "Failed to retrieve shipping configuration.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while loading shipping settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    // Prepare settings - serialize booleans to strings for backend compatibility
    const payload = {
      shippingAdjustmentEnabled: String(shippingAdjustmentEnabled),
      shippingAdjustmentMode,
      ignoreShippingDifference: String(ignoreShippingDifference),
      ignoreDifferenceAmount: String(ignoreDifferenceAmount),
      shippingPaymentMode,
      shippingRefundMode,
      customerAddressEditUntil,
      adminCanEditAfterAwb: String(adminCanEditAfterAwb),
      autoRegenerateAwb: String(autoRegenerateAwb),
      defaultPrepaidShipping: String(defaultPrepaidShipping),
      defaultCodShipping: String(defaultCodShipping),
      shippingRateProvider,
      shippingFallbackMode,
    };

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showStatus("success", "Shipping configuration settings successfully saved.");
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to save shipping settings.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while saving the configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const tabClasses = (tab: TabName) => {
    const base = "px-4.5 py-3 text-xs font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap";
    const active = "border-primary text-primary font-semibold";
    const inactive = "border-transparent text-muted-foreground hover:text-foreground";
    return `${base} ${activeTab === tab ? active : inactive}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-light">Loading shipping settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Shipping Configuration</h1>
          <p className="text-xs text-muted-foreground font-light">
            Set up shipping adjustment policies, rate providers, and customer address editing guidelines.
          </p>
        </div>
        <div>
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border text-xs leading-relaxed animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Tabs list */}
      <div className="border-b border-border/40 overflow-x-auto scrollbar-none flex">
        <button onClick={() => setActiveTab("general")} className={tabClasses("general")}>
          <DollarSign className="w-3.5 h-3.5" />
          General Settings
        </button>
        <button onClick={() => setActiveTab("address")} className={tabClasses("address")}>
          <MapPin className="w-3.5 h-3.5" />
          Address Editing
        </button>
        <button onClick={() => setActiveTab("adjustments")} className={tabClasses("adjustments")}>
          <Sliders className="w-3.5 h-3.5" />
          Shipping Adjustments
        </button>
        <button onClick={() => setActiveTab("rates")} className={tabClasses("rates")}>
          <Globe className="w-3.5 h-3.5" />
          Shipping Rates
        </button>
        <button onClick={() => setActiveTab("courier")} className={tabClasses("courier")}>
          <Truck className="w-3.5 h-3.5" />
          Courier Integration
        </button>
      </div>

      {/* Main Settings Card */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 max-w-3xl shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-border/20">
                <h3 className="font-serif text-sm font-semibold text-foreground">Default Fallback Shipping Charges</h3>
                <p className="text-[10px] text-muted-foreground font-light">Set values used when adjustments are disabled or as fallback.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Default Prepaid Shipping (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={defaultPrepaidShipping}
                    onChange={(e) => setDefaultPrepaidShipping(e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Default COD Shipping (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={defaultCodShipping}
                    onChange={(e) => setDefaultCodShipping(e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Fallback Mode Strategy
                </label>
                <select
                  value={shippingFallbackMode}
                  onChange={(e: any) => setShippingFallbackMode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                >
                  <option value="default_charges">Use Default Flat Charges (₹{defaultPrepaidShipping}/₹{defaultCodShipping})</option>
                  <option value="manual_review">Flag Order for Manual Review</option>
                </select>
                <p className="text-[9px] text-muted-foreground font-light">Controls actions taken when the selected shipping rate provider fails to calculate rates.</p>
              </div>
            </div>
          )}

          {/* TAB 2: ADDRESS EDITING */}
          {activeTab === "address" && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-border/20">
                <h3 className="font-serif text-sm font-semibold text-foreground">Address Editing Cutoff Policies</h3>
                <p className="text-[10px] text-muted-foreground font-light">Configure rules defining when customer and admin updates are locked.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Customer Can Edit Shipping Address Until Order Is:
                </label>
                <select
                  value={customerAddressEditUntil}
                  onChange={(e: any) => setCustomerAddressEditUntil(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                >
                  <option value="pending">Pending Only</option>
                  <option value="paid">Payment Verified</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="never">Never Allow Customer Edits</option>
                </select>
                <p className="text-[9px] text-muted-foreground font-light">Updates are always strictly blocked for customers after AWB is generated or pickup is requested.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3.5 bg-secondary/15 border border-border/20 rounded-xl">
                  <div className="space-y-0.5 max-w-[80%]">
                    <label className="text-xs font-semibold text-foreground block">Allow Admin Address Editing After AWB</label>
                    <span className="text-[9px] text-muted-foreground font-light leading-normal block">
                      Enabling this permits administrators to update address details after an airway bill is generated. This will automatically cancel the active AWB.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={adminCanEditAfterAwb}
                    onChange={(e) => setAdminCanEditAfterAwb(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-secondary/15 border border-border/20 rounded-xl">
                  <div className="space-y-0.5 max-w-[80%]">
                    <label className="text-xs font-semibold text-foreground block">Auto-Regenerate AWB on Address Change</label>
                    <span className="text-[9px] text-muted-foreground font-light leading-normal block">
                      When enabled, saving a modified address after AWB generation will automatically calculate new shipping charges and request a brand new courier waybill.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRegenerateAwb}
                    disabled={!adminCanEditAfterAwb}
                    onChange={(e) => setAutoRegenerateAwb(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SHIPPING ADJUSTMENTS */}
          {activeTab === "adjustments" && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-border/20">
                <h3 className="font-serif text-sm font-semibold text-foreground">Shipping Adjustment Policy Configuration</h3>
                <p className="text-[10px] text-muted-foreground font-light">Set up thresholds and handling modes for address modifications.</p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-secondary/15 border border-border/20 rounded-xl">
                <div className="space-y-0.5 max-w-[80%]">
                  <label className="text-xs font-semibold text-foreground block">Enable Shipping Adjustments</label>
                  <span className="text-[9px] text-muted-foreground font-light leading-normal block">
                    If disabled, checkout rates are frozen and no recalculations will take place when addresses are updated.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={shippingAdjustmentEnabled}
                  onChange={(e) => setShippingAdjustmentEnabled(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {shippingAdjustmentEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Adjustment Mode
                      </label>
                      <select
                        value={shippingAdjustmentMode}
                        onChange={(e: any) => setShippingAdjustmentMode(e.target.value)}
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                      >
                        <option value="automatic">Automatic Recalculation</option>
                        <option value="manual">Manual Approval Needed</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Ignore Small Differences threshold
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={ignoreShippingDifference}
                          onChange={(e) => setIgnoreShippingDifference(e.target.checked)}
                          className="w-4.5 h-4.5 rounded text-primary focus:ring-primary cursor-pointer"
                        />
                        <span className="text-xs text-muted-foreground">Ignore shipping changes up to:</span>
                        <input
                          type="number"
                          min="0"
                          disabled={!ignoreShippingDifference}
                          value={ignoreDifferenceAmount}
                          onChange={(e) => setIgnoreDifferenceAmount(e.target.value)}
                          className="w-20 px-3 py-1.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-xs outline-none text-foreground disabled:opacity-50"
                        />
                        <span className="text-xs text-muted-foreground">₹</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Additional Shipping Collection Method
                      </label>
                      <select
                        value={shippingPaymentMode}
                        onChange={(e: any) => setShippingPaymentMode(e.target.value)}
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                      >
                        <option value="razorpay">Razorpay Payment Link (Online)</option>
                        <option value="offline">Offline / COD Balance update</option>
                        <option value="absorb">Absorb All Charges (Store absorbs)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Lower Shipping Fee Handling
                      </label>
                      <select
                        value={shippingRefundMode}
                        onChange={(e: any) => setShippingRefundMode(e.target.value)}
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                      >
                        <option value="ignore">Ignore Difference (Store absorbs)</option>
                        <option value="refund">Automatic Refund to Source</option>
                        <option value="store_credit">Convert to Customer Store Credit</option>
                        <option value="manual">Flag for Manual Admin Decision</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: SHIPPING RATES */}
          {activeTab === "rates" && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-border/20">
                <h3 className="font-serif text-sm font-semibold text-foreground">Shipping Rate Provider</h3>
                <p className="text-[10px] text-muted-foreground font-light">Choose the calculation engine to quote real-time shipping fees.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Shipping Rate Source:
                </label>
                <select
                  value={shippingRateProvider}
                  onChange={(e: any) => setShippingRateProvider(e.target.value)}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                >
                  <option value="flat_rate">Flat Rate (Prepaid/COD Default Charges)</option>
                  <option value="zone_rules">Zone/Pincode Regional Rules (Mumbai, Delhi, Bangalore regional pricing)</option>
                  <option value="courier_api">Courier Live API Integration (Delhivery/BlueDart live lookup mock)</option>
                </select>
                <p className="text-[9px] text-muted-foreground font-light">Rate calculation rules are evaluated on checkout and address recalculations.</p>
              </div>
            </div>
          )}

          {/* TAB 5: COURIER INTEGRATION */}
          {activeTab === "courier" && (
            <div className="space-y-4">
              <div className="pb-3 border-b border-border/20">
                <h3 className="font-serif text-sm font-semibold text-foreground">Courier Integration & Sync Rules</h3>
                <p className="text-[10px] text-muted-foreground font-light">Configure status synchronization and waybill generation settings.</p>
              </div>

              <div className="p-4 bg-secondary/15 border border-border/20 rounded-2xl flex items-center justify-between text-xs font-light leading-relaxed">
                <span>All Courier Lifecycles (Pending Pickup, Picked Up, In Transit, Delivered) sync automatically in the background independently of order fulfillment states.</span>
                <span className="shrink-0 font-bold uppercase text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-3">Sync Connected</span>
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}
