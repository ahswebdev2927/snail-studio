"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Inbox,
  Settings,
  Mail,
  Smartphone,
  Monitor,
  AlertCircle,
  ShoppingBag,
  AlertTriangle,
  MessageSquare,
  Server,
  Loader2,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationCategory = "orders" | "inventory" | "reviews" | "system";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: "low" | "medium" | "high" | "critical";
  read: boolean;
  createdAt: string;
  data: Record<string, any> | null;
}

interface PreferencesGrid {
  category: NotificationCategory;
  email: boolean;
  inApp: boolean;
  push: boolean;
}

export default function NotificationsInboxPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read">("all");
  const [activeCategory, setActiveCategory] = useState<"all" | NotificationCategory>("all");
  const [page, setPage] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<PreferencesGrid[]>([]);
  const [savingPrefs, setSavingPrefs] = useState<string | null>(null);

  const limit = 10;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === "all" ? "" : `&status=${activeTab}`;
      const categoryParam = activeCategory === "all" ? "" : `&category=${activeCategory}`;
      const offset = (page - 1) * limit;

      const res = await fetch(`/api/admin/notifications?limit=${limit}&offset=${offset}${statusParam}${categoryParam}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch("/api/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        
        // Map response array to complete grid (using default true values)
        const categories: NotificationCategory[] = ["orders", "inventory", "reviews", "system"];
        const grid = categories.map((cat) => {
          const match = data.preferences?.find((p: any) => p.category === cat);
          return {
            category: cat,
            email: match ? match.email : true,
            inApp: match ? match.inApp : true,
            push: match ? match.push : true,
          };
        });
        setPreferences(grid);
      }
    } catch (err) {
      console.error("Failed to load preferences:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, activeCategory, page]);

  useEffect(() => {
    if (showSettings) {
      fetchPreferences();
    }
  }, [showSettings]);

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        if (activeTab === "unread") {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }
      }
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        if (activeTab === "unread") {
          setNotifications([]);
        }
      }
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleTogglePreference = async (
    category: NotificationCategory,
    channel: "email" | "inApp" | "push",
    currentVal: boolean
  ) => {
    const key = `${category}-${channel}`;
    setSavingPrefs(key);
    try {
      const payload = {
        category,
        email: channel === "email" ? !currentVal : undefined,
        inApp: channel === "inApp" ? !currentVal : undefined,
        push: channel === "push" ? !currentVal : undefined,
      };

      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPreferences((prev) =>
          prev.map((p) =>
            p.category === category ? { ...p, [channel]: !currentVal } : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to update preference:", err);
    } finally {
      setSavingPrefs(null);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getCategoryDetails = (category: NotificationCategory) => {
    switch (category) {
      case "orders":
        return { label: "Orders", icon: ShoppingBag, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" };
      case "inventory":
        return { label: "Inventory", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
      case "reviews":
        return { label: "Reviews", icon: MessageSquare, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" };
      default:
        return { label: "System", icon: Server, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-rose-600 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/40";
      case "high":
        return "text-orange-600 bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900/40";
      case "medium":
        return "text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40";
      default:
        return "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40";
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="space-y-1 z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Operations Alerts Center
          </h1>
          <p className="text-xs text-muted-foreground font-light">
            Monitor real-time checkout activities, system diagnostics, and catalog notifications.
          </p>
        </div>
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={handleMarkAllRead}
            disabled={notifications.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary hover:bg-muted border border-border rounded-xl text-xs font-semibold uppercase tracking-wider text-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 bg-card border border-border hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            title="Notification Settings"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar Controls */}
        <div className="space-y-4 lg:col-span-1">
          {/* Status Filters */}
          <div className="bg-card border border-border/40 rounded-3xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 block mb-2">
              Status Filter
            </span>
            <button
              onClick={() => { setActiveTab("all"); setPage(1); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer",
                activeTab === "all" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary/65 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2"><Inbox className="w-3.5 h-3.5" /> All Alerts</span>
            </button>
            <button
              onClick={() => { setActiveTab("unread"); setPage(1); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer",
                activeTab === "unread" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary/65 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> Unread</span>
            </button>
            <button
              onClick={() => { setActiveTab("read"); setPage(1); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer",
                activeTab === "read" ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary/65 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2"><CheckCheck className="w-3.5 h-3.5" /> Read</span>
            </button>
          </div>

          {/* Category Filters */}
          <div className="bg-card border border-border/40 rounded-3xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 block mb-2">
              Alert Categories
            </span>
            <button
              onClick={() => { setActiveCategory("all"); setPage(1); }}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer",
                activeCategory === "all" ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:bg-secondary/35 hover:text-foreground"
              )}
            >
              All Categories
            </button>
            {(["orders", "inventory", "reviews", "system"] as NotificationCategory[]).map((cat) => {
              const details = getCategoryDetails(cat);
              const Icon = details.icon;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setPage(1); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer",
                    activeCategory === cat ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:bg-secondary/35 hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {details.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="bg-card border border-border/40 rounded-3xl p-16 text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground font-light">Retrieving notification items...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-card border border-border/40 rounded-3xl p-16 text-center space-y-3">
              <div className="p-4 bg-secondary/30 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto text-muted-foreground/60">
                <Bell className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">All Clear!</h3>
                <p className="text-xs text-muted-foreground font-light max-w-sm mx-auto">
                  No notifications match your current selection filter.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                const details = getCategoryDetails(n.category);
                const CatIcon = details.icon;

                return (
                  <div
                    key={n.id}
                    className={cn(
                      "p-4 bg-card border rounded-2xl transition-all flex items-start gap-4 hover:border-primary/20",
                      !n.read ? "border-border/60 shadow-sm" : "border-border/20 opacity-80"
                    )}
                  >
                    {/* Category Status Indicator Icon */}
                    <div className={cn("p-2 rounded-xl border flex items-center justify-center shrink-0 mt-0.5", details.color)}>
                      <CatIcon className="w-4 h-4" />
                    </div>

                    {/* Text Details Area */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border", getPriorityBadge(n.priority))}>
                          {n.priority}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-foreground leading-normal mt-1">{n.title}</h4>
                      <p className="text-xs text-muted-foreground font-light leading-relaxed">{n.message}</p>
                    </div>

                    {/* Read Action Button */}
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-[10px] font-semibold text-primary hover:underline px-2 py-1 bg-primary/5 hover:bg-primary/10 rounded-md shrink-0 transition-colors cursor-pointer"
                      >
                        Read
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Paginated Navigation Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-card border border-border/40 rounded-2xl text-xs">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 bg-secondary hover:bg-muted border border-border rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-muted-foreground">
                    Page <span className="font-semibold text-foreground">{page}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 bg-secondary hover:bg-muted border border-border rounded-lg disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Preferences Settings Panel Modal Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/20 backdrop-blur-sm transition-all duration-300">
          {/* Backdrop Click Away */}
          <div className="absolute inset-0 cursor-default" onClick={() => setShowSettings(false)} />

          <div className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl p-6 relative flex flex-col justify-between overflow-y-auto animate-fade-in">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="space-y-0.5">
                  <h3 className="font-serif text-lg font-semibold text-foreground">Alert Channels Setup</h3>
                  <p className="text-[11px] text-muted-foreground font-light">Mute categories or restrict notification channels.</p>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-2.5 py-1 text-xs bg-secondary hover:bg-muted border border-border rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Preferences Configuration Grid */}
              <div className="space-y-6">
                {preferences.map((pref) => {
                  const details = getCategoryDetails(pref.category);
                  const Icon = details.icon;

                  return (
                    <div key={pref.category} className="space-y-2 border-b border-border/20 pb-4 last:border-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">{details.label} Notifications</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 pt-1.5">
                        {/* In-App Toggle */}
                        <button
                          onClick={() => handleTogglePreference(pref.category, "inApp", pref.inApp)}
                          disabled={savingPrefs !== null}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 border rounded-xl gap-1 text-center transition-all cursor-pointer",
                            pref.inApp ? "bg-primary/5 border-primary text-primary" : "border-border/30 hover:border-border text-muted-foreground"
                          )}
                        >
                          <Monitor className="w-4 h-4" />
                          <span className="text-[9px] font-medium">In-App</span>
                          {savingPrefs === `${pref.category}-inApp` && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        </button>

                        {/* Email Toggle */}
                        <button
                          onClick={() => handleTogglePreference(pref.category, "email", pref.email)}
                          disabled={savingPrefs !== null}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 border rounded-xl gap-1 text-center transition-all cursor-pointer",
                            pref.email ? "bg-primary/5 border-primary text-primary" : "border-border/30 hover:border-border text-muted-foreground"
                          )}
                        >
                          <Mail className="w-4 h-4" />
                          <span className="text-[9px] font-medium">Email</span>
                          {savingPrefs === `${pref.category}-email` && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        </button>

                        {/* Push Toggle */}
                        <button
                          onClick={() => handleTogglePreference(pref.category, "push", pref.push)}
                          disabled={savingPrefs !== null}
                          className={cn(
                            "flex flex-col items-center justify-center p-2.5 border rounded-xl gap-1 text-center transition-all cursor-pointer",
                            pref.push ? "bg-primary/5 border-primary text-primary" : "border-border/30 hover:border-border text-muted-foreground"
                          )}
                        >
                          <Smartphone className="w-4 h-4" />
                          <span className="text-[9px] font-medium">Push</span>
                          {savingPrefs === `${pref.category}-push` && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 text-[10px] text-muted-foreground leading-relaxed mt-6">
              * Configurations are saved immediately. Muting notifications may delay your awareness of critical operations.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
