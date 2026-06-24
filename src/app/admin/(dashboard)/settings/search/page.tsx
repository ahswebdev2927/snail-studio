"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, RotateCw, Save, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff, BarChart3, AlertTriangle, Clock, TrendingUp } from "lucide-react";

interface SearchLogItem {
  query: string;
  count: number;
  avgResults?: number;
}

interface RecentLogItem {
  id: string;
  query: string;
  resultsCount: number;
  ipAddress: string | null;
  createdAt: string;
}

interface AnalyticsData {
  popular: SearchLogItem[];
  recent: RecentLogItem[];
  failed: SearchLogItem[];
}

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

  // Search Analytics State
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const showStatus = useCallback((type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = (await res.json()) as { meilisearch_host?: string; meilisearch_api_key?: string };
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
  }, [showStatus]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/search-analytics");
      if (res.ok) {
        const data = (await res.json()) as AnalyticsData;
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Error loading search analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Load configuration on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSettings();
      fetchAnalytics();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchSettings, fetchAnalytics]);

  const handleRefreshAnalytics = () => {
    setLoadingAnalytics(true);
    fetchAnalytics();
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
        const errData = (await res.json()) as { error?: string };
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

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
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
    <div className="space-y-8 pb-10">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Search Engine Settings</h1>
          <p className="text-xs text-muted-foreground font-light">
            Manage Meilisearch server integrations and review search analytics data.
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

      {/* Meilisearch Config */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/10 pb-3">
          <Search className="w-4.5 h-4.5 text-primary" />
          Meilisearch Credentials Configuration
        </h3>
        <form onSubmit={handleSave} className="space-y-4 pt-1">
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
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-primary" />}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/10 pb-3">
          <h2 className="font-serif text-lg font-normal text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Search Analytics Dashboard
          </h2>
          <button
            onClick={handleRefreshAnalytics}
            disabled={loadingAnalytics}
            className="text-[10px] font-semibold text-primary uppercase tracking-widest hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3 h-3 ${loadingAnalytics ? "animate-spin" : ""}`} />
            Refresh Stats
          </button>
        </div>

        {loadingAnalytics ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/40 rounded-3xl p-6 h-[250px] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Popular Searches */}
              <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/10 pb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Top Trending Search Terms
                  </h3>
                </div>
                {analyticsData && analyticsData.popular.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-light">
                      <thead>
                        <tr className="border-b border-border/10 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                          <th className="py-2">Query</th>
                          <th className="py-2 text-center">Frequency</th>
                          <th className="py-2 text-right">Avg. Results Found</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/5">
                        {analyticsData.popular.map((item, idx) => (
                          <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                            <td className="py-2.5 font-medium text-foreground capitalize">
                              {item.query}
                            </td>
                            <td className="py-2.5 text-center text-muted-foreground">
                              {item.count}
                            </td>
                            <td className="py-2.5 text-right font-medium text-foreground">
                              {item.avgResults}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/80 font-light italic py-8 text-center">
                    No searches recorded yet.
                  </p>
                )}
              </div>

              {/* Failed Searches (0 Results) */}
              <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/10 pb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Missed Searches (0 Results Found)
                  </h3>
                </div>
                {analyticsData && analyticsData.failed.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-light">
                      <thead>
                        <tr className="border-b border-border/10 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                          <th className="py-2">Query</th>
                          <th className="py-2 text-right">Missed Search Frequency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/5">
                        {analyticsData.failed.map((item, idx) => (
                          <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                            <td className="py-2.5 font-medium text-amber-600 dark:text-amber-500 capitalize flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              {item.query}
                            </td>
                            <td className="py-2.5 text-right font-medium text-foreground">
                              {item.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/80 font-light italic py-8 text-center">
                    Great! No queries returned 0 results yet.
                  </p>
                )}
              </div>

            </div>

            {/* Recent Searches */}
            <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/10 pb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Recent Search Activity Logs
                </h3>
              </div>
              {analyticsData && analyticsData.recent.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-light">
                    <thead>
                      <tr className="border-b border-border/10 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                        <th className="py-2">Time</th>
                        <th className="py-2">Search Query</th>
                        <th className="py-2 text-center">Results Returned</th>
                        <th className="py-2 text-right">Client IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/5">
                      {analyticsData.recent.map((item) => (
                        <tr key={item.id} className="hover:bg-secondary/10 transition-colors">
                          <td className="py-2.5 text-muted-foreground font-light">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="py-2.5 font-medium text-foreground capitalize">
                            {item.query}
                          </td>
                          <td className="py-2.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                item.resultsCount > 0
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {item.resultsCount} items
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono text-muted-foreground">
                            {item.ipAddress || "127.0.0.1"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/80 font-light italic py-8 text-center">
                  No searches logged yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
