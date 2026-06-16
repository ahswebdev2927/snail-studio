"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Save, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function AdminPaymentsSettingsPage() {
  // Form State
  const [paymentGateway, setPaymentGateway] = useState("mock");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

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
        if (data.payment_gateway) setPaymentGateway(data.payment_gateway);
        if (data.razorpay_key_id) setRazorpayKeyId(data.razorpay_key_id);
        if (data.razorpay_key_secret) setRazorpayKeySecret(data.razorpay_key_secret);
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
          payment_gateway: paymentGateway,
          razorpay_key_id: razorpayKeyId,
          razorpay_key_secret: razorpayKeySecret,
        }),
      });

      if (res.ok) {
        showStatus("success", "Payment configuration settings saved successfully.");
        fetchSettings(); // Refresh to mask secret key
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-light">Loading payment settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Payment Gateway Settings</h1>
          <p className="text-xs text-muted-foreground font-light">
            Toggle the mock gateway settings and secure production Stripe/Razorpay keys.
          </p>
        </div>
        <div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Keys"}
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
          <div className="flex items-center justify-between p-3.5 bg-secondary/35 dark:bg-secondary/15 rounded-2xl border border-border/40">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">Active Payment Gateway</span>
              <p className="text-[10px] text-muted-foreground font-light">Choose which backend integration manages payments.</p>
            </div>
            <select
              value={paymentGateway}
              onChange={(e) => setPaymentGateway(e.target.value)}
              className="px-3.5 py-2 bg-card border border-border rounded-xl text-xs font-medium outline-none text-foreground cursor-pointer"
            >
              <option value="mock" className="bg-card text-foreground">Mock Developer Gateway</option>
              <option value="razorpay" className="bg-card text-foreground">Razorpay Gateway</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Razorpay Key ID
              </label>
              <input
                type="text"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                placeholder="rzp_test_..."
                className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Razorpay Secret Key
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-10 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
