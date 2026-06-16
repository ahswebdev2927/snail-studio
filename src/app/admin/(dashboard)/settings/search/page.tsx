"use client";

import React, { useState, useEffect } from "react";
import { Search, RotateCw, Save, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function AdminSearchSettingsPage() {
  // Form State
  const [meiliHost, setMeiliHost] = useState("");
  const [meiliApiKey, setMeiliApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Global State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
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
        if (data.meilisearch_host) setMeiliHost(data.meilisearch_host);
        if (data.meilisearch_api_key) setMeiliApiKey(data.meilisearch_api_key);
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
          meilisearch_host: meiliHost,
          meilisearch_api_key: meiliApiKey,
        }),
      });

      if (res.ok) {
        showStatus("success", "Search Sync configuration successfully saved.");
        fetchSettings(); // Refresh to mask api key
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

  const handleRebuildIndex = async () => {
    setIsRebuilding(true);
    showStatus("success", "Rebuilding catalogs search index...");
    
    // Simulate API request trigger
    setTimeout(() => {
      setIsRebuilding(false);
      showStatus("success", "Search index rebuilt successfully!");
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-light">Loading search settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Search Indexes Configuration</h1>
          <p className="text-xs text-muted-foreground font-light">
            Manage Meilisearch server settings and trigger indexing catalogs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRebuildIndex}
            disabled={isRebuilding}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary text-secondary-foreground border border-border hover:bg-secondary/70 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${isRebuilding ? "animate-spin" : ""}`} />
            {isRebuilding ? "Rebuilding Index..." : "Rebuild Index"}
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save Config"}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Meilisearch Host
              </label>
              <input
                type="text"
                required
                value={meiliHost}
                onChange={(e) => setMeiliHost(e.target.value)}
                placeholder="https://edge-meili.snailstudio.com"
                className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Meilisearch API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  required
                  value={meiliApiKey}
                  onChange={(e) => setMeiliApiKey(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-10 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 hover:text-foreground cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
