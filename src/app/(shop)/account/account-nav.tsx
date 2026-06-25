"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  MapPin, 
  Heart, 
  User, 
  Shield, 
  LogOut,
  Loader2,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountNavProps {
  user: {
    name: string | null;
    email: string | null;
    phoneNumber: string;
    image: string | null;
    createdAt?: Date;
  };
}

export function AccountNav({ user }: AccountNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      name: "Dashboard",
      href: "/account",
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: "Order History",
      href: "/account/orders",
      icon: ShoppingBag,
      exact: false
    },
    {
      name: "Address Book",
      href: "/account/addresses",
      icon: MapPin,
      exact: false
    },
    {
      name: "Wishlist",
      href: "/wishlist",
      icon: Heart,
      exact: false
    },
    {
      name: "Profile Settings",
      href: "/account/profile",
      icon: User,
      exact: false
    },
    {
      name: "Security",
      href: "/account/security",
      icon: Shield,
      exact: false
    }
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return phone.slice(-2);
  };

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="w-full space-y-6">
      {/* Desktop Profile Card */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 hidden md:block relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -right-8 -bottom-8 w-20 h-20 rounded-full bg-primary/5 blur-xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center font-serif text-lg font-bold text-primary shrink-0">
            {getInitials(user.name, user.phoneNumber)}
          </div>
          <div className="space-y-0.5 min-w-0">
            <h3 className="font-serif text-base font-semibold text-foreground truncate">
              {user.name || "Guest Customer"}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">{user.email || user.phoneNumber}</p>
            <p className="text-[9px] uppercase tracking-wider font-bold text-accent pt-1">
              Member Since {memberSince}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Toggle & Horizontal Scroll */}
      <div className="md:hidden flex items-center justify-between bg-card border border-border/40 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/15 flex items-center justify-center font-serif text-sm font-bold text-primary">
            {getInitials(user.name, user.phoneNumber)}
          </div>
          <div>
            <h4 className="font-serif text-sm font-semibold text-foreground">
              {user.name || "My Account"}
            </h4>
            <p className="text-[10px] text-muted-foreground">{user.phoneNumber}</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar Nav Links */}
      <nav className="bg-card border border-border/40 rounded-3xl p-4 hidden md:block space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== "/account";
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-xs font-medium tracking-wide transition-all duration-200 group cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
              )} />
              {item.name}
            </Link>
          );
        })}

        <div className="pt-4 border-t border-border/20 mt-4">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3.5 px-4.5 py-3 rounded-2xl text-xs font-semibold uppercase tracking-wider text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 shrink-0" />
            )}
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar Nav Menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border border-border/40 rounded-2xl p-4 space-y-1 shadow-xl animate-in fade-in duration-200">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) && item.href !== "/account";
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
          
          <div className="pt-2 border-t border-border/20 mt-2">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
            >
              {loggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
