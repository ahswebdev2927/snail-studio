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
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionUser } from "@/lib/auth/session";
import Link from "next/link";
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

  const notifications = [
    { id: 1, text: "Low stock alert: 'Rosewood Matte Coffin'", time: "10m ago", read: false },
    { id: 2, text: "New order received #10484", time: "1h ago", read: false },
    { id: 3, text: "Review request submitted for approval", time: "4h ago", read: true },
  ];

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
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
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
                  <span className="text-[10px] text-primary hover:underline cursor-pointer">
                    Mark all read
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto pt-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "px-4 py-2.5 hover:bg-secondary/35 flex flex-col gap-0.5 cursor-pointer border-b border-border/10 last:border-0",
                        !n.read && "bg-primary/5 dark:bg-primary/2"
                      )}
                    >
                      <p className="text-xs text-foreground leading-normal font-light">
                        {n.text}
                      </p>
                      <span className="text-[9px] text-muted-foreground">
                        {n.time}
                      </span>
                    </div>
                  ))}
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
  </>
);
}
