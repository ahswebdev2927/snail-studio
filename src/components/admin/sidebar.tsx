"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BarChart3,
  Layers,
  Boxes,
  ClipboardList,
  Users,
  Star,
  Ticket,
  Settings,
  ChevronRight,
  Bell,
  Tag,
  ShoppingBag,
  Plus,
  Folder,
  Award,
  Library,
  Sliders,
  History,
  Gift,
  SlidersHorizontal,
  Store,
  Truck,
  Mail,
  CreditCard,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionUser } from "@/lib/auth/session";

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  closeMobileSidebar: () => void;
  user: SessionUser;
}

interface MenuItem {
  name: string;
  href?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  subItems?: {
    name: string;
    href: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: React.ComponentType<any>;
  }[];
}

export default function Sidebar({ isCollapsed, isMobileOpen, closeMobileSidebar, user }: SidebarProps) {
  const pathname = usePathname();

  // Collapsed Sidebar Hover State & References
  const [activeHover, setActiveHover] = useState<{
    item: MenuItem;
    rect: DOMRect;
  } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (item: MenuItem, event: React.MouseEvent<HTMLElement>) => {
    const shouldShow = isCollapsed || (item.subItems && item.subItems.length > 0);
    if (!shouldShow) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveHover({ item, rect });
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveHover(null);
    }, 150);
  };

  const handlePopupMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handlePopupMouseLeave = () => {
    handleMouseLeave();
  };

  // Clear hovering when sidebar state is toggled
  useEffect(() => {
    const handle = setTimeout(() => {
      setActiveHover(null);
    }, 0);
    return () => clearTimeout(handle);
  }, [isCollapsed]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Settings State
  const [storeLogo, setStoreLogo] = useState("");
  const [storeLogoCollapsed, setStoreLogoCollapsed] = useState("");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.store_logo) setStoreLogo(data.store_logo);
          if (data.store_logo_collapsed) setStoreLogoCollapsed(data.store_logo_collapsed);
          if (data.store_name) setStoreName(data.store_name);
        }
      } catch (err) {
        console.error("Failed to load settings in sidebar:", err);
      }
    };
    fetchSettings();
  }, []);

  const menuItems: MenuItem[] = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: Home
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3
    },
    {
      name: "Catalog",
      icon: Layers,
      subItems: [
        { name: "All Products", href: "/admin/products", icon: ShoppingBag },
        { name: "Add Product", href: "/admin/products/new", icon: Plus },
        { name: "Categories", href: "/admin/categories", icon: Folder },
        { name: "Attributes", href: "/admin/attributes", icon: Sliders },
        { name: "Collections", href: "/admin/collections", icon: Library },
        { name: "Brands", href: "/admin/brands", icon: Award },
        { name: "Audit Logs", href: "/admin/products/audit-logs", icon: History }
      ]
    },
    {
      name: "Inventory",
      href: "/admin/inventory",
      icon: Boxes
    },
    {
      name: "Orders",
      href: "/admin/orders",
      icon: ClipboardList
    },
    {
      name: "Customers",
      href: "/admin/customers",
      icon: Users
    },
    {
      name: "Reviews",
      href: "/admin/reviews",
      icon: Star
    },
    {
      name: "Offers",
      icon: Tag,
      subItems: [
        { name: "Coupons", href: "/admin/coupons", icon: Ticket },
        { name: "Bundles", href: "/admin/bundles", icon: Gift }
      ]
    },
    {
      name: "Notifications",
      href: "/admin/notifications",
      icon: Bell
    },
    {
      name: "Settings",
      icon: Settings,
      subItems: [
        { name: "General", href: "/admin/settings/general", icon: SlidersHorizontal },
        { name: "Storefront", href: "/admin/settings/storefront", icon: Store },
        { name: "Shipping", href: "/admin/settings/shipping", icon: Truck },
        { name: "SMTP Mailer", href: "/admin/settings/smtp", icon: Mail },
        { name: "Payments", href: "/admin/settings/payments", icon: CreditCard },
        { name: "Search Sync", href: "/admin/settings/search", icon: Search }
      ]
    }
  ];



  const renderLink = (item: MenuItem) => {
    const Icon = item.icon;
    const isSubActive = item.subItems?.some(sub => pathname === sub.href);
    const isActive = item.href ? pathname === item.href : isSubActive;

    const hasSubItems = !!item.subItems;

    if (hasSubItems) {
      return (
        <div key={item.name} className="space-y-1">
          <button
            onMouseEnter={(e) => handleMouseEnter(item, e)}
            onMouseLeave={handleMouseLeave}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium tracking-wide transition-all duration-200 group text-left cursor-pointer",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className={cn("w-5 h-5 shrink-0 transition-transform duration-300",
                isActive ? "text-primary" : "text-muted-foreground/80 group-hover:scale-110"
              )} />
              {!isCollapsed && <span>{item.name}</span>}
            </div>
            {!isCollapsed && (
              <ChevronRight
                className={cn(
                  "w-4 h-4 text-muted-foreground/60 transition-transform duration-300 group-hover:translate-x-0.5"
                )}
              />
            )}
          </button>
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href || "#"}
        onClick={closeMobileSidebar}
        onMouseEnter={(e) => handleMouseEnter(item, e)}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium tracking-wide transition-all duration-200 group cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
            : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
        )}
      >
        <Icon className={cn("w-5 h-5 shrink-0 transition-transform duration-300",
          isActive ? "text-primary-foreground" : "text-muted-foreground/80 group-hover:scale-110"
        )} />
        {!isCollapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  const sidebarClasses = cn(
    "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border/50 text-foreground transition-all duration-300 ease-in-out lg:static lg:translate-x-0 shadow-xl lg:shadow-none",
    isCollapsed ? "w-20" : "w-64",
    isMobileOpen ? "translate-x-0" : "-translate-x-full"
  );

  return (
    <aside className={sidebarClasses}>
      {/* Brand Header */}
      <div className={cn(
        "h-20 flex items-center border-b border-border/40 shrink-0 px-6",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 group w-full justify-center">
          {isCollapsed ? (
            storeLogoCollapsed ? (
              <img
                src={storeLogoCollapsed}
                alt={storeName || "Store Icon"}
                className="h-9 w-9 object-contain rounded-xl group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-serif font-bold text-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                {storeName ? storeName.charAt(0) : "S"}
              </div>
            )
          ) : (
            storeLogo ? (
              <div className="h-9 w-full flex items-center justify-center overflow-hidden">
                <img
                  src={storeLogo}
                  alt={storeName || "Store Logo"}
                  className="h-9 w-auto max-w-[180px] object-contain group-hover:scale-[1.02] transition-transform duration-300"
                />
              </div>
            ) : (
              <>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-serif font-bold text-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                  {storeName ? storeName.charAt(0) : "S"}
                </div>
                <span className="font-serif text-lg font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent opacity-95 group-hover:opacity-100 transition-opacity">
                  {storeName || "Snail Studio"}
                </span>
              </>
            )
          )}
        </Link>
      </div>

      {/* Menu Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        {menuItems.map(renderLink)}
      </div>

      {/* Hover Tooltip/Dropdown Popover */}
      {activeHover && (isCollapsed || (activeHover.item.subItems && activeHover.item.subItems.length > 0)) && (
        <div
          style={{
            position: "fixed",
            top: (() => {
              const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 1080;
              // calculate approximate height based on item type
              const popupHeight = activeHover.item.subItems
                ? (activeHover.item.subItems.length * 36 + 60)
                : 40;
              let top = activeHover.rect.top;
              // adjust to prevent overflowing bottom of viewport
              if (top + popupHeight > viewportHeight) {
                top = Math.max(12, viewportHeight - popupHeight - 12);
              }
              return top;
            })(),
            left: activeHover.rect.right + 12,
          }}
          className={cn(
            "z-[100] bg-card/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-2 animate-slide-in-right",
            activeHover.item.subItems ? "w-48" : "w-auto px-4 py-2 text-xs font-semibold tracking-wider uppercase text-foreground whitespace-nowrap"
          )}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        >
          {activeHover.item.subItems ? (
            <div className="flex flex-col">
              <div className="px-3 py-1.5 text-xs font-bold tracking-wider text-primary text-center">
                {` ${activeHover.item.name.toUpperCase()} `}
              </div>
              <div className="border-b border-border/80 my-1.5 mx-1" />
              <div className="space-y-0.5">
                {activeHover.item.subItems.map((sub) => {
                  const isSubItemActive = pathname === sub.href;
                  const SubIcon = sub.icon;
                  return (
                    <Link
                      key={sub.name}
                      href={sub.href}
                      onClick={() => {
                        closeMobileSidebar();
                        setActiveHover(null);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 group/sub",
                        isSubItemActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                      )}
                    >
                      <SubIcon className={cn("w-4 h-4 shrink-0 transition-transform duration-200",
                        isSubItemActive ? "text-primary" : "text-muted-foreground/80 group-hover/sub:scale-110"
                      )} />
                      <span>{sub.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <span className="font-semibold">{activeHover.item.name}</span>
          )}
        </div>
      )}

    </aside>
  );
}
