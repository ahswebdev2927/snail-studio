"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import MediaPicker from "@/components/media/media-picker";

export default function AdminGeneralSettingsPage() {
  // Form State
  const [storeName, setStoreName] = useState("Snail Studio");
  const [storeLogo, setStoreLogo] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [storeSlug, setStoreSlug] = useState("snail-studio");
  const [storeEmail, setStoreEmail] = useState("hello@snailstudio.com");
  const [storePhone, setStorePhone] = useState("+91 99999 99999");

  // Shipping Configuration State
  const [shippingStandardFee, setShippingStandardFee] = useState("99");
  const [shippingFreeThreshold, setShippingFreeThreshold] = useState("1500");
  const [shippingExpressFee, setShippingExpressFee] = useState("250");

  // Global State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load configuration on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.store_name) setStoreName(data.store_name);
        if (data.store_slug) setStoreSlug(data.store_slug);
        if (data.store_logo) setStoreLogo(data.store_logo);
        if (data.store_email) setStoreEmail(data.store_email);
        if (data.store_phone) setStorePhone(data.store_phone);
        if (data.shipping_standard_fee) setShippingStandardFee(data.shipping_standard_fee);
        if (data.shipping_free_threshold) setShippingFreeThreshold(data.shipping_free_threshold);
        if (data.shipping_express_fee) setShippingExpressFee(data.shipping_express_fee);
      } else {
        showStatus("error", "Failed to retrieve configuration settings.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while fetching settings.");
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

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName,
          store_slug: storeSlug,
          store_email: storeEmail,
          store_phone: storePhone,
          store_logo: storeLogo,
          shipping_standard_fee: shippingStandardFee,
          shipping_free_threshold: shippingFreeThreshold,
          shipping_express_fee: shippingExpressFee,
        }),
      });

      if (res.ok) {
        showStatus("success", "General settings successfully saved.");
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to save settings.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while saving the configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMediaSelect = (selected: any[]) => {
    if (selected.length > 0) {
      setStoreLogo(selected[0].url);
    }
    setShowMediaPicker(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-light">Loading general settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">General Settings</h1>
          <p className="text-xs text-muted-foreground font-light">
            Configure core store settings, business profile, and layout rules.
          </p>
        </div>
        <div>
          <button
            onClick={handleSave}
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

      {/* Main Form container */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-6 max-w-3xl">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Logo Upload Section */}
          <div className="space-y-2 pb-4 border-b border-border/40">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Store Logo
            </label>
            <div className="flex items-center gap-4.5">
              <div className="relative h-16 w-32 rounded-2xl bg-secondary/30 border border-border flex items-center justify-center overflow-hidden">
                {storeLogo ? (
                  <img
                    src={storeLogo}
                    alt="Store Logo Preview"
                    className="h-full w-full object-contain p-2 animate-fade-in"
                  />
                ) : (
                  <span className="text-[10px] text-muted-foreground font-light">No Logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="px-3.5 py-2 bg-secondary hover:bg-muted text-foreground rounded-xl text-xs font-medium border border-border transition-colors cursor-pointer"
                  >
                    {storeLogo ? "Change Logo" : "Upload Logo"}
                  </button>
                  {storeLogo && (
                    <button
                      type="button"
                      onClick={() => setStoreLogo("")}
                      className="px-3.5 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl text-xs font-medium border border-destructive/20 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                  Recommended size: 300x80px or wider aspect ratio. WebP, PNG, or SVG. Max 2MB.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Store Name
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Snail Studio"
                className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Store Slug URL
              </label>
              <input
                type="text"
                required
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value)}
                placeholder="snail-studio"
                className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Contact Email
              </label>
              <input
                type="email"
                required
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                placeholder="hello@snailstudio.com"
                className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Contact Phone
              </label>
              <input
                type="text"
                required
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="+91 99999 99999"
                className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Cloudinary Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-60 bg-foreground/20 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-card border border-border/40 rounded-3xl w-full max-w-4xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto relative my-auto">
            <MediaPicker
              onSelect={handleMediaSelect}
              onClose={() => setShowMediaPicker(false)}
              maxSelection={1}
              title="Select Store Logo"
            />
          </div>
        </div>
      )}
    </div>
  );
}
