"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  HelpCircle,
  ExternalLink,
  ShoppingBag,
  AlertTriangle,
  MessageSquare,
  Server,
  AlertCircle,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionUser } from "@/lib/auth/session";
import Link from "next/link";
import { nanoid } from "nanoid";
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  user: SessionUser;
}

export default function Header({
  isCollapsed,
  toggleSidebar,
  toggleMobileSidebar,
  theme,
  toggleTheme,
  user
}: HeaderProps) {
  const pathname = usePathname();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleProfileMouseEnter = () => {
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
      profileTimeoutRef.current = null;
    }
    // Immediately close notifications and clear its timer
    if (notificationsTimeoutRef.current) {
      clearTimeout(notificationsTimeoutRef.current);
      notificationsTimeoutRef.current = null;
    }
    setNotificationsOpen(false);
    setProfileDropdownOpen(true);
  };

  const handleProfileMouseLeave = () => {
    profileTimeoutRef.current = setTimeout(() => {
      setProfileDropdownOpen(false);
    }, 200); // 200ms delay
  };

  const handleNotificationsMouseEnter = () => {
    if (notificationsTimeoutRef.current) {
      clearTimeout(notificationsTimeoutRef.current);
      notificationsTimeoutRef.current = null;
    }
    // Immediately close profile and clear its timer
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
      profileTimeoutRef.current = null;
    }
    setProfileDropdownOpen(false);
    setNotificationsOpen(true);
  };

  const handleNotificationsMouseLeave = () => {
    notificationsTimeoutRef.current = setTimeout(() => {
      setNotificationsOpen(false);
    }, 200); // 200ms delay
  };

  useEffect(() => {
    return () => {
      if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
      if (notificationsTimeoutRef.current) clearTimeout(notificationsTimeoutRef.current);
    };
  }, []);

  // Derive page title from pathname
  const getPageTitle = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length <= 1) return "Overview";

    // settings/general -> "General Settings"
    if (segments[1] === "settings" && segments[2]) {
      return `${segments[2].charAt(0).toUpperCase() + segments[2].slice(1)} Settings`;
    }
    // products/audit-logs -> "Product Audit Logs"
    if (segments[1] === "products" && segments[2] === "audit-logs") {
      return "Product Audit Logs";
    }
    // products/new -> "New Product"
    if (segments[1] === "products" && segments[2] === "new") {
      return "Add Product";
    }

    // Capitalize and format
    const mainTitle = segments[1].charAt(0).toUpperCase() + segments[1].slice(1);
    return mainTitle;
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/admin/login";
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  interface ToastItem {
    id: string;
    category: string;
    title: string;
    message: string;
    priority: string;
    timestamp: Date;
  }

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case "orders":
        return {
          label: "Orders",
          icon: ShoppingBag,
          color: "bg-success/15 border-success/30 text-success",
        };
      case "inventory":
        return {
          label: "Inventory",
          icon: AlertTriangle,
          color: "bg-warning/15 border-warning/30 text-warning",
        };
      case "reviews":
        return {
          label: "Reviews",
          icon: MessageSquare,
          color: "bg-info/10 border-info/20 text-info",
        };
      case "system":
        return {
          label: "System",
          icon: Server,
          color: "bg-destructive/10 border-destructive/20 text-destructive",
        };
      default:
        return {
          label: "Alert",
          icon: AlertCircle,
          color: "bg-secondary text-foreground",
        };
    }
  };

  // Format time ago utility
  const formatTimeAgo = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Play browser Web Audio chime for high priority alerts
  const playPremiumNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.25); // C5
      playTone(659.25, now + 0.12, 0.35); // E5
    } catch (err) {
      console.error("Audio cue play failed:", err);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    // 1. Initial fetch of unread list
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/admin/notifications?status=unread&limit=5");
        if (res.ok) {
          const data = await res.json();
          setNotificationList(data.notifications);
          setHasUnread(data.notifications.length > 0);
        }
      } catch (err) {
        console.error("Failed to load initial notifications:", err);
      }
    };
    fetchNotifications();
 
    // 3. Register FCM Push Notifications
    const setupFCM = async () => {
      try {
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
          console.warn("[FCM] Browser does not support service workers or notifications.");
          return;
        }
 
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
 
        if (permission !== "granted") {
          console.warn("[FCM] Notification permission denied.");
          return;
        }
 
        // Register service worker explicitly
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        
        // Dynamically import Firebase messaging methods
        const { getMessaging, getToken } = await import("firebase/messaging");
        const { app } = await import("@/lib/firebase/client");
 
        const messaging = getMessaging(app);
        
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
 
        if (token) {
          await fetch("/api/notifications/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          console.log("[FCM] Device token registered successfully.");
        } else {
          console.warn("[FCM] No registration token received.");
        }
      } catch (fcmErr) {
        console.warn("[FCM] Client registration failed:", fcmErr);
      }
    };
    setupFCM();
 
     // 2. Real-time notifications listener
     const eventSource = new EventSource("/api/notifications/sse");
 
     eventSource.addEventListener("new_notification", (event: MessageEvent) => {
       try {
         const newNotif = JSON.parse(event.data);
         if (newNotif.userId === user.id) {
           setNotificationList((prev) => {
             if (prev.some((n) => n.id === newNotif.id)) return prev;
             return [newNotif, ...prev].slice(0, 5);
           });
           setHasUnread(true);
 
           // Add to active toast notification banners
           const toastId = `toast_${nanoid(8)}`;
           setToasts((prev) => [
             ...prev,
             {
               id: toastId,
               category: newNotif.category,
               title: newNotif.title,
               message: newNotif.message,
               priority: newNotif.priority,
               timestamp: new Date()
             }
           ]);
 
           // Auto-remove toast after 6 seconds
           setTimeout(() => {
             setToasts((prev) => prev.filter((t) => t.id !== toastId));
           }, 6000);
 
           if (newNotif.priority === "high" || newNotif.priority === "critical") {
             playPremiumNotificationSound();
           }
         }
       } catch (err) {
         console.error("Failed to parse incoming SSE message:", err);
       }
     });
 
     eventSource.onerror = (err) => {
       console.warn("SSE connection error. EventSource will automatically retry connecting.", err);
     };

    return () => {
      eventSource.close();
    };
  }, [user.id, user.role]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotificationList([]);
        setHasUnread(false);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotificationList((prev) => prev.filter((n) => n.id !== id));
        // Check if any unread ones remain in state
        setHasUnread((prev) => notificationList.length > 1);
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  return (
    <>
      <header className="h-20 sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-6 transition-all duration-300">
      {/* Left side actions (Sidebar Toggles & Page Title) */}
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <button
          onClick={toggleMobileSidebar}
          aria-label="Toggle Mobile Sidebar"
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground lg:hidden cursor-pointer"
        >
          <Menu className="w-5.5 h-5.5" />
        </button>

        {/* Desktop Collapse Trigger */}
        <button
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="hidden lg:flex p-2 rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 animate-pulse" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>

        {/* Current Screen Title */}
        <h2 className="font-serif text-lg font-medium tracking-wide text-foreground animate-fade-in hidden sm:block">
          {getPageTitle()}
        </h2>
      </div>

      {/* Right side actions (Search, Theme, Notifications, Profile) */}
      <div className="flex items-center gap-3">
        {/* Mock Search Bar */}
        <div className="relative hidden md:block w-64 lg:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search panels... (Ctrl+K)"
            className="w-full pl-10 pr-4 py-2 bg-secondary/35 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-xs outline-none transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Theme Toggler */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-2.5 rounded-2xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-300 hover:rotate-12 cursor-pointer border border-border/10"
        >
          {theme === "light" ? (
            <Moon className="w-4.5 h-4.5 text-muted-foreground" />
          ) : (
            <Sun className="w-4.5 h-4.5 text-accent" />
          )}
        </button>

        {/* Notifications Dropdown */}
        <div
          className="relative"
          onMouseEnter={handleNotificationsMouseEnter}
          onMouseLeave={handleNotificationsMouseLeave}
        >
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileDropdownOpen(false);
            }}
            aria-label="Notifications"
            className="p-2.5 rounded-2xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground relative cursor-pointer border border-border/10"
          >
            <Bell className="w-4.5 h-4.5" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <>
              {/* Invisible backdrop click-away (mobile only) */}
              <div
                className="fixed inset-0 z-40 cursor-default md:hidden"
                onClick={() => setNotificationsOpen(false)}
              />

              <div className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-2xl shadow-xl py-3 z-50 animate-fade-in">
                <div className="px-4 pb-2 border-b border-border/40 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Notifications
                  </span>
                  <span
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    Mark all read
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto pt-2 px-1">
                  {notificationList.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-8 italic font-light">
                      No unread notifications
                    </p>
                  ) : (
                    notificationList.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkRead(n.id)}
                        className={cn(
                          "px-3 py-2.5 hover:bg-secondary/40 flex flex-col gap-0.5 cursor-pointer border-b border-border/10 last:border-0 rounded-xl transition-all",
                          !n.read && "bg-primary/5 dark:bg-primary/2"
                        )}
                      >
                        <p className="text-xs text-foreground leading-normal font-medium">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-normal font-light">
                          {n.message}
                        </p>
                        <span className="text-[9px] text-muted-foreground mt-0.5">
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-border/40 mt-2 pt-2 px-4 text-center">
                  <Link
                    href="/admin/notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[10px] text-primary hover:underline font-semibold block"
                  >
                    View All Notifications
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border/40 hidden sm:block" />

        {/* Profile Dropdown */}
        <div
          className="relative"
          onMouseEnter={handleProfileMouseEnter}
          onMouseLeave={handleProfileMouseLeave}
        >
          <button
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 pr-3 rounded-2xl hover:bg-secondary/60 border border-border/20 transition-all text-left cursor-pointer"
          >
            <div className="w-8.5 h-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold font-serif text-sm">
              {user.name ? user.name.charAt(0) : "A"}
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold text-foreground leading-tight max-w-[100px] truncate">
                {user.name || "Admin"}
              </p>
              <span className="text-[9px] text-muted-foreground leading-none">
                System Admin
              </span>
            </div>
          </button>

          {profileDropdownOpen && (
            <>
              {/* Invisible backdrop click-away (mobile only) */}
              <div
                className="fixed inset-0 z-40 cursor-default md:hidden"
                onClick={() => setProfileDropdownOpen(false)}
              />

              <div className="absolute right-0 mt-3 w-48 bg-card border border-border rounded-2xl shadow-xl py-2 z-50 animate-fade-in">
                <Link
                  href="/admin/settings/general"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/35 transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <Link
                  href="/account"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/35 transition-all"
                >
                  <User className="w-4 h-4" />
                  My Account
                </Link>
                <Link
                  href="/"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/35 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Go to Storefront
                </Link>
                <div className="border-t border-border/40 my-1.5" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-destructive hover:bg-destructive/10 transition-all text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

    <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)}>
      <ModalHeader>
        <ModalTitle>Confirm Sign Out</ModalTitle>
        <ModalDescription>
          Are you sure you want to sign out of the Snail Studio Admin Portal? You will need to sign in again to access the management dashboard, products database, and order logs.
        </ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <Button
          variant="outline"
          onClick={() => setShowLogoutModal(false)}
          className="w-full sm:w-auto cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={confirmLogout}
          isLoading={isLoggingOut}
          className="w-full sm:w-auto cursor-pointer"
        >
          Sign Out
        </Button>
      </ModalFooter>
    </Modal>
 
    {/* Toast Notification Container */}
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const catDetails = getCategoryDetails(toast.category);
        const CatIcon = catDetails.icon;
 
        return (
          <div
            key={toast.id}
            className="pointer-events-auto w-full bg-card/95 dark:bg-card/95 border border-border/80 shadow-2xl rounded-2xl p-4 flex gap-3 animate-in slide-in-from-bottom-5 duration-300 relative overflow-hidden"
          >
            {/* Category Indicator Dot/Icon */}
            <div className={cn("p-2 rounded-xl border flex items-center justify-center shrink-0 h-9 w-9 mt-0.5", catDetails.color)}>
              <CatIcon className="w-4.5 h-4.5" />
            </div>
 
            {/* Toast Details */}
            <div className="flex-1 min-w-0 pr-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {catDetails.label}
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">
                  Just now
                </span>
              </div>
              <h5 className="text-xs font-semibold text-foreground mt-1">{toast.title}</h5>
              <p className="text-[11px] text-muted-foreground font-light leading-relaxed mt-0.5">{toast.message}</p>
            </div>
 
            {/* Close Button */}
            <button
              onClick={() => dismissToast(toast.id)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground cursor-pointer transition-all p-1 hover:bg-secondary rounded-lg"
              aria-label="Close Toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  </>
);
}
