"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Layers, 
  Boxes, 
  ClipboardList, 
  Users, 
  Star, 
  Ticket, 
  LayoutGrid, 
  Settings, 
  ChevronDown,
  Sparkles,
  ChevronRight
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
  icon: React.ComponentType<any>;
  subItems?: { name: string; href: string }[];
}

export default function Sidebar({ isCollapsed, isMobileOpen, closeMobileSidebar, user }: SidebarProps) {
  const pathname = usePathname();

  // Collapsible sub-menu states
  const [catalogOpen, setCatalogOpen] = useState(
    pathname.startsWith("/admin/products") || 
    pathname.startsWith("/admin/collections") ||
    pathname.startsWith("/admin/attributes")
  );
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/admin/settings"));

  const menuItems: MenuItem[] = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: Home
    },
    {
      name: "Catalog",
      icon: Layers,
      subItems: [
        { name: "Products", href: "/admin/products" },
        { name: "Add Product", href: "/admin/products/new" },
        { name: "Collections", href: "/admin/collections" },
        { name: "Attributes", href: "/admin/attributes" },
        { name: "Audit Logs", href: "/admin/products/audit-logs" }
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
      name: "Coupons",
      href: "/admin/coupons",
      icon: Ticket
    },
    {
      name: "Settings",
      icon: Settings,
      subItems: [
        { name: "General", href: "/admin/settings/general" },
        { name: "Hero Banners", href: "/admin/settings/hero-banners" },
        { name: "SMTP Mailer", href: "/admin/settings/smtp" },
        { name: "Payments", href: "/admin/settings/payments" },
        { name: "Search Sync", href: "/admin/settings/search" }
      ]
    }
  ];



  const renderLink = (item: MenuItem) => {
    const Icon = item.icon;
    const isSubActive = item.subItems?.some(sub => pathname === sub.href);
    const isActive = item.href ? pathname === item.href : isSubActive;
    
    const hasSubItems = !!item.subItems;
    const isExpanded = item.name === "Catalog" ? catalogOpen : settingsOpen;

    const handleToggleMenu = () => {
      if (item.name === "Catalog") {
        if (!catalogOpen) {
          setCatalogOpen(true);
          setSettingsOpen(false);
        } else {
          setCatalogOpen(false);
        }
      } else if (item.name === "Settings") {
        if (!settingsOpen) {
          setSettingsOpen(true);
          setCatalogOpen(false);
        } else {
          setSettingsOpen(false);
        }
      }
    };

    if (hasSubItems) {
      return (
        <div key={item.name} className="space-y-1">
          <button
            onClick={handleToggleMenu}
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
              <ChevronDown 
                className={cn(
                  "w-4 h-4 text-muted-foreground/60 transition-transform duration-300",
                  isExpanded ? "rotate-0" : "-rotate-90"
                )} 
              />
            )}
          </button>

          {/* Sub Items list with slide-down transition */}
          {!isCollapsed && (
            <div 
              className={cn(
                "pl-12 pr-2 space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                isExpanded ? "max-h-60 opacity-100 py-1" : "max-h-0 opacity-0 py-0 pointer-events-none"
              )}
            >
              {item.subItems?.map((sub) => {
                const isSubItemActive = pathname === sub.href;
                return (
                  <Link
                    key={sub.name}
                    href={sub.href}
                    onClick={closeMobileSidebar}
                    className={cn(
                      "block py-2 px-3 rounded-xl text-xs font-light tracking-wide transition-all duration-200",
                      isSubItemActive
                        ? "text-primary font-medium border-l-2 border-primary pl-2.5 bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:translate-x-0.5"
                    )}
                  >
                    {sub.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href || "#"}
        onClick={closeMobileSidebar}
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
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-serif font-bold text-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
            S
          </div>
          {!isCollapsed && (
            <span className="font-serif text-lg font-semibold tracking-wide bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent opacity-95 group-hover:opacity-100 transition-opacity">
              Snail Studio
            </span>
          )}
        </Link>
      </div>

      {/* Menu Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        {menuItems.map(renderLink)}
      </div>

    </aside>
  );
}
