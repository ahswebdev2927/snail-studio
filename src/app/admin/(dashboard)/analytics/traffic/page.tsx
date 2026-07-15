"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  RefreshCw, 
  Tag, 
  Loader2,
  Store,
  Signal
} from "lucide-react";

interface GA4Summary {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

interface TrafficSource {
  source: string;
  sessions: number;
  activeUsers: number;
  conversions: number;
  revenue: number;
}

interface CampaignAttribution {
  campaign: string;
  sessions: number;
  conversions: number;
  revenue: number;
}

interface FunnelStep {
  step: string;
  count: number;
  rate: number;
}

interface GA4AnalyticsResponse {
  summary: GA4Summary;
  sources: TrafficSource[];
  campaigns: CampaignAttribution[];
  funnel: FunnelStep[];
  realtimeUsers: number;
}

export default function TrafficAnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [gaData, setGaData] = useState<GA4AnalyticsResponse | null>(null);
  const [useMock, setUseMock] = useState(false);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("192.168.")) {
        setIsDev(true);
      }
    }
  }, []);

  async function loadGoogleAnalytics() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/google-analytics?range=${dateRange}${useMock ? "&useMock=true" : ""}`);
      if (res.ok) {
        setGaData(await res.json());
      }
    } catch (error) {
      console.error("Error loading Google Analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadGoogleAnalytics();
  }, [dateRange, useMock]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Time Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">
            Traffic & <span className="font-serif italic font-light text-primary">Acquisition (GA4)</span>
          </h1>
          <p className="text-xs text-muted-foreground font-light font-sans">
            Store traffic and audience acquisition reports pulled from Google Analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Live indicator tag */}
          {gaData && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-semibold animate-pulse border border-emerald-500/20">
              <Signal className="w-3.5 h-3.5" />
              <span>{gaData.realtimeUsers} Online Now</span>
            </div>
          )}

          {/* Mock data toggle (only in dev mode) */}
          {isDev && (
            <label className="inline-flex items-center gap-2 cursor-pointer bg-card border border-border px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground select-none hover:bg-secondary/15 transition-all">
              <input
                type="checkbox"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-8 h-4.5 bg-secondary/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3.5 rtl:peer-checked:after:-translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-muted-foreground peer-checked:after:bg-primary after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary/20"></div>
              <span>Sample Data</span>
            </label>
          )}

          {/* Refresh Button */}
          <button 
            onClick={loadGoogleAnalytics}
            title="Refresh Analytics"
            className="p-2.5 bg-card border border-border hover:bg-secondary/15 rounded-xl text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {/* Time Filter */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl">
            <Calendar className="w-4.5 h-4.5 text-muted-foreground" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold focus:outline-none focus:ring-0 text-foreground cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 w-full flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card border border-border/40 rounded-3xl shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-light">Loading Google Analytics 4 intelligence...</p>
        </div>
      ) : !gaData ? (
        <div className="h-96 w-full flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card border border-border/40 rounded-3xl shadow-sm p-6 text-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm font-semibold">No Google Analytics Data Available</p>
          <p className="text-xs font-light max-w-xs text-muted-foreground">
            Please ensure that Google Analytics credentials and property settings are correctly configured in your environment variables.
          </p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Overview Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card: Active Users */}
            <div className="bg-card border border-border/40 hover:border-primary/10 transition-all rounded-2xl p-5 space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Users
                </span>
                <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-semibold text-foreground font-mono">
                  {gaData.summary.activeUsers.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground font-light">
                  Distinct users on storefront
                </p>
              </div>
            </div>

            {/* Card: Sessions */}
            <div className="bg-card border border-border/40 hover:border-primary/10 transition-all rounded-2xl p-5 space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sessions
                </span>
                <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-semibold text-foreground font-mono">
                  {gaData.summary.sessions.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground font-light">
                  Total browsing sessions
                </p>
              </div>
            </div>

            {/* Card: Page Views */}
            <div className="bg-card border border-border/40 hover:border-primary/10 transition-all rounded-2xl p-5 space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Page Views
                </span>
                <div className="p-1.5 bg-violet-500/10 text-violet-500 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-semibold text-foreground font-mono">
                  {gaData.summary.pageViews.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground font-light">
                  Total pages load count
                </p>
              </div>
            </div>

            {/* Card: Bounce Rate */}
            <div className="bg-card border border-border/40 hover:border-primary/10 transition-all rounded-2xl p-5 space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Bounce Rate
                </span>
                <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-semibold text-foreground font-mono">
                  {gaData.summary.bounceRate.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground font-light">
                  Single-page sessions rate
                </p>
              </div>
            </div>

            {/* Card: Avg Session Duration */}
            <div className="bg-card border border-border/40 hover:border-primary/10 transition-all rounded-2xl p-5 space-y-2.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Avg. Session Time
                </span>
                <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-semibold text-foreground font-mono">
                  {formatDuration(gaData.summary.avgSessionDuration)}
                </p>
                <p className="text-[10px] text-muted-foreground font-light">
                  Time spent per visit
                </p>
              </div>
            </div>
          </div>

          {/* Funnel & Traffic Sources Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-6">
            {/* Conversion Funnel */}
            <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-5 hover:border-primary/10 transition-all shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/10 pb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Ecommerce Conversion Funnel
                </h3>
              </div>
              
              <div className="space-y-4 pt-2">
                {gaData.funnel.map((item, idx) => {
                  const nextItem = gaData.funnel[idx + 1];
                  const dropoff = nextItem ? (100 - (nextItem.count / item.count) * 100) : 0;
                  
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">{item.step}</span>
                        <span className="text-muted-foreground font-mono">
                          {item.count.toLocaleString()} ({item.rate}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary/75 rounded-full transition-all duration-500" 
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                      {nextItem && (
                        <p className="text-[9px] text-rose-500/80 font-bold uppercase tracking-wider text-right">
                          ↓ {dropoff.toFixed(1)}% Drop-off rate
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Traffic Sources Table */}
            <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all shadow-sm">
              <div className="flex items-center gap-2 border-b border-border/10 pb-3">
                <Users className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Traffic Acquisition Channels (Source / Medium)
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-light">
                  <thead>
                    <tr className="border-b border-border/10 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-1">Source / Medium</th>
                      <th className="py-2.5 text-center">Sessions</th>
                      <th className="py-2.5 text-center">Active Users</th>
                      <th className="py-2.5 text-center">Conversions</th>
                      <th className="py-2.5 text-right px-1">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/5">
                    {gaData.sources.map((item, idx) => (
                      <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                        <td className="py-3 px-1 font-medium text-foreground capitalize">
                          {item.source}
                        </td>
                        <td className="py-3 text-center text-muted-foreground font-mono">
                          {item.sessions.toLocaleString()}
                        </td>
                        <td className="py-3 text-center text-muted-foreground font-mono">
                          {item.activeUsers.toLocaleString()}
                        </td>
                        <td className="py-3 text-center text-muted-foreground font-mono">
                          {item.conversions}
                        </td>
                        <td className="py-3 text-right font-medium text-primary font-mono px-1">
                          ₹{Math.round(item.revenue).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Campaign Performance Table */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/10 pb-3">
              <Tag className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Marketing Campaign Performance (UTM Campaigns)
              </h3>
            </div>
            
            {gaData.campaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-light">
                  <thead>
                    <tr className="border-b border-border/10 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-1">Campaign Name</th>
                      <th className="py-2.5 text-center">Attributed Sessions</th>
                      <th className="py-2.5 text-center">Transactions</th>
                      <th className="py-2.5 text-right px-1">Attributed Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/5">
                    {gaData.campaigns.map((item, idx) => (
                      <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                        <td className="py-3 px-1 font-medium text-foreground">
                          {item.campaign}
                        </td>
                        <td className="py-3 text-center text-muted-foreground font-mono">
                          {item.sessions.toLocaleString()}
                        </td>
                        <td className="py-3 text-center text-muted-foreground font-mono">
                          {item.conversions}
                        </td>
                        <td className="py-3 text-right font-medium text-primary font-mono px-1">
                          ₹{Math.round(item.revenue).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/80 font-light italic py-8 text-center">
                No campaign traffic detected in selected period.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
