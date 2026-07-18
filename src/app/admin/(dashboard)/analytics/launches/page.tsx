"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Users,
  Eye,
  Bell,
  RefreshCw,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Inbox,
  Activity
} from "lucide-react";
import Link from "next/link";

interface Summary {
  totalSubscribers: number;
  totalViews: number;
  totalAlerts: number;
  productsCount: number;
}

interface LaunchProduct {
  id: string;
  name: string;
  slug: string;
  status: string;
  launchDate: string | null;
  launchTime: string | null;
  autoPublish: boolean;
  subscribers: number;
  views: number;
  notificationsSent: number;
  conversions: number;
  conversionRate: string;
}

interface ActivityItem {
  id: string;
  productId: string;
  productName: string;
  eventType: string;
  metadata: any;
  createdAt: string;
}

export default function LaunchAnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [productsList, setProductsList] = useState<LaunchProduct[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics/launches");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setProductsList(data.products);
        setActivities(data.activities);
      } else {
        setError("Failed to load launch insights.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while loading analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  const getEventBadge = (type: string) => {
    const base = "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ";
    switch (type) {
      case "subscriber_signup":
        return base + "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "view":
        return base + "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "publish":
        return base + "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "email_launch":
      case "email_1d":
      case "email_3d":
      case "email_7d":
        return base + "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      default:
        return base + "bg-stone-500/10 text-stone-500";
    }
  };

  const formatEventName = (type: string) => {
    switch (type) {
      case "subscriber_signup":
        return "New Subscription";
      case "view":
        return "Preview Page View";
      case "publish":
        return "Auto Published Live";
      case "email_launch":
        return "Launch Alert Sent";
      case "email_1d":
        return "1-Day Alert Sent";
      case "email_3d":
        return "3-Day Alert Sent";
      case "email_7d":
        return "7-Day Alert Sent";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Product Launch Insights</h1>
          <p className="text-xs text-muted-foreground font-light">
            Monitor preview performance, drop subscriptions, notification logs, and drop conversions.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer border border-border disabled:opacity-55"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Calculating launch insights...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Subscribers */}
            <div className="p-6 bg-card border border-border/40 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Drop Subscribers
                </span>
                <span className="text-2xl font-semibold block">{summary?.totalSubscribers || 0}</span>
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  Direct interest intent
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-primary/10 text-primary">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Total Preview Page Views */}
            <div className="p-6 bg-card border border-border/40 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Teaser Views
                </span>
                <span className="text-2xl font-semibold block">{summary?.totalViews || 0}</span>
                <span className="text-[10px] text-muted-foreground font-light">
                  Product catalog previews
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-500">
                <Eye className="w-5 h-5" />
              </div>
            </div>

            {/* Total Emails Dispatched */}
            <div className="p-6 bg-card border border-border/40 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Alerts Dispatched
                </span>
                <span className="text-2xl font-semibold block">{summary?.totalAlerts || 0}</span>
                <span className="text-[10px] text-stone-500 font-medium">
                  Automated email count
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500">
                <Bell className="w-5 h-5" />
              </div>
            </div>

            {/* Campaign Products Count */}
            <div className="p-6 bg-card border border-border/40 rounded-3xl shadow-xs flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Active Drop Items
                </span>
                <span className="text-2xl font-semibold block">{summary?.productsCount || 0}</span>
                <span className="text-[10px] text-stone-500 font-medium">
                  Scheduled upcoming drops
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-500">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products Table (Left Column span 2) */}
            <div className="lg:col-span-2 bg-card border border-border/40 rounded-3xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="font-serif text-base font-normal">Drop Performance Metrics</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-light">
                  Compare click-through views, subscription rates, and post-launch checkout conversion rates.
                </p>
              </div>

              {productsList.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-border/60 rounded-2xl">
                  <Inbox className="w-8 h-8 mx-auto text-muted-foreground/45 mb-2.5" />
                  <p className="text-xs text-muted-foreground font-light">No products with launch activity found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                        <th className="py-3 px-2">Product</th>
                        <th className="py-3 px-2 text-center">Status</th>
                        <th className="py-3 px-2 text-center">Date</th>
                        <th className="py-3 px-2 text-right">Subs</th>
                        <th className="py-3 px-2 text-right">Views</th>
                        <th className="py-3 px-2 text-right">Sales</th>
                        <th className="py-3 px-2 text-right">CVR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {productsList.map((prod) => (
                        <tr key={prod.id} className="hover:bg-secondary/15 transition-colors">
                          <td className="py-3 px-2 font-medium max-w-[160px] truncate">
                            <Link href={`/admin/products`} className="hover:underline flex items-center gap-1">
                              {prod.name}
                              <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                            </Link>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                prod.status === "Launching Soon"
                                  ? "bg-primary/10 text-primary border border-primary/10"
                                  : prod.status === "Coming Soon"
                                  ? "bg-orange-500/10 text-orange-600"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {prod.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center text-muted-foreground whitespace-nowrap">
                            {prod.launchDate ? (
                              <span className="flex items-center gap-1 justify-center">
                                <Calendar className="w-3 h-3 shrink-0" />
                                {prod.launchDate}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-2 text-right font-semibold text-foreground">{prod.subscribers}</td>
                          <td className="py-3 px-2 text-right text-muted-foreground">{prod.views}</td>
                          <td className="py-3 px-2 text-right text-muted-foreground">{prod.conversions}</td>
                          <td className="py-3 px-2 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                            {prod.conversionRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live activity feed (Right Column) */}
            <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col">
              <div>
                <h3 className="font-serif text-base font-normal flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary" />
                  Live Activity Feed
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-light">
                  Real-time events logging drop subscriptions and dispatches.
                </p>
              </div>

              {activities.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-border/60 rounded-2xl flex-1 flex flex-col justify-center">
                  <Inbox className="w-8 h-8 mx-auto text-muted-foreground/45 mb-2.5" />
                  <p className="text-xs text-muted-foreground font-light">No activity recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3.5 overflow-y-auto max-h-[360px] pr-1 flex-1">
                  {activities.map((item) => (
                    <div key={item.id} className="flex gap-3 text-xs justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{item.productName}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatEventName(item.eventType)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={getEventBadge(item.eventType)}>
                          {item.eventType.replace("subscriber_signup", "signup")}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 block mt-0.5">
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
