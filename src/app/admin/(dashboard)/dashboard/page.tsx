"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Tag,
  Boxes,
  Compass,
  ArrowRight,
  Settings,
  Loader2
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  lowStockCount: number;
  recentOrders: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    user: {
      name: string | null;
      phoneNumber: string;
    } | null;
  }[];
  lowStockItems: {
    sku: string;
    name: string;
    stock: number;
  }[];
  salesHistory: {
    date: string;
    amount: number;
  }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/dashboard/stats");
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStats();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-light">Loading dashboard analytics...</p>
      </div>
    );
  }

  // Format currency helpers
  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const formatPriceDecimal = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // SVG Chart Coordinates calculation
  const maxAmount = Math.max(...stats.salesHistory.map(h => h.amount), 500000); // scaled to at least ₹5,000 to prevent zero flatness
  const chartPoints = stats.salesHistory
    .map((h, idx) => `${10 + idx * 60},${140 - (h.amount / maxAmount) * 120}`)
    .join(" ");
  const chartFillPoints = `10,160 ${chartPoints} 370,160`;

  // Get status color badges for orders
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "processing":
        return "bg-primary/10 text-primary border-primary/20";
      case "shipped":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "delivered":
        return "bg-secondary text-secondary-foreground border-border";
      case "cancelled":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">
            Welcome Back, <span className="font-serif italic font-light text-primary">Administrator</span>
          </h1>
          <p className="text-xs text-muted-foreground font-light">
            Here is what's happening with Snail Studio today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 relative z-10">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm shadow-primary/5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Product
          </Link>
          <Link
            href="/admin/coupons"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/95 border border-secondary rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
          >
            <Tag className="w-4 h-4 text-secondary-foreground" />
            New Coupon
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Sales</span>
            <div className="p-2 rounded-2xl text-emerald-500 bg-emerald-500/10 group-hover:scale-105 transition-all">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
              {formatPrice(stats.totalSales)}
            </p>
            <p className="text-[10px] text-muted-foreground font-light">Revenue from completed checkout sessions</p>
          </div>
        </div>

        {/* Orders Received */}
        <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Orders Received</span>
            <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
              {stats.totalOrders}
            </p>
            <p className="text-[10px] text-muted-foreground font-light">Total client purchases registered</p>
          </div>
        </div>

        {/* New Customers */}
        <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customers CRM</span>
            <div className="p-2 rounded-2xl text-accent bg-accent/10 group-hover:scale-105 transition-all">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
              {stats.totalCustomers}
            </p>
            <p className="text-[10px] text-muted-foreground font-light">Registered shopper profiles</p>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stock Alerts</span>
            <div className={`p-2 rounded-2xl group-hover:scale-105 transition-all ${
              stats.lowStockCount > 0 ? "text-amber-500 bg-amber-500/10 animate-pulse" : "text-muted-foreground bg-secondary"
            }`}>
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className={`font-serif text-2xl font-semibold tracking-wide ${
              stats.lowStockCount > 0 ? "text-amber-500 font-bold" : "text-foreground"
            }`}>
              {stats.lowStockCount} SKUs
            </p>
            <p className="text-[10px] text-muted-foreground font-light">Variants at or under low thresholds</p>
          </div>
        </div>
      </div>

      {/* Charts & Analytics Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart Card */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 lg:col-span-2 space-y-4 hover:border-primary/10 transition-all shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-wide">Weekly Revenue Trend</h3>
              <p className="text-[10px] text-muted-foreground font-light">
                Day-by-day sales analytics from paid transactions (INR).
              </p>
            </div>
            <span className="px-3 py-1 bg-secondary/50 border border-border/40 text-[9px] font-bold uppercase tracking-wider rounded-lg text-foreground">
              Last 7 Days
            </span>
          </div>

          {/* SVG Custom Area Chart */}
          <div className="h-56 w-full flex items-end pt-4">
            <svg viewBox="0 0 380 160" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              {/* Horizontal Grid lines */}
              <line x1="0" y1="20" x2="380" y2="20" stroke="currentColor" className="text-border/20" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="55" x2="380" y2="55" stroke="currentColor" className="text-border/20" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="380" y2="90" stroke="currentColor" className="text-border/20" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="125" x2="380" y2="125" stroke="currentColor" className="text-border/20" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="160" x2="380" y2="160" stroke="currentColor" className="text-border/40" strokeWidth="0.5" />

              {/* Gradient Area Fill */}
              <polygon points={chartFillPoints} fill="url(#chartGradient)" />

              {/* Line Stroke */}
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                points={chartPoints}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {stats.salesHistory.map((h, idx) => (
                <circle 
                  key={idx}
                  cx={10 + idx * 60} 
                  cy={140 - (h.amount / maxAmount) * 120} 
                  r="3.5" 
                  fill="hsl(var(--background))" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="2" 
                />
              ))}
            </svg>
          </div>
          {/* X Axis Labels */}
          <div className="flex justify-between text-[9px] text-muted-foreground font-light px-1 font-mono">
            {stats.salesHistory.map((h) => {
              const label = new Date(h.date).toLocaleDateString(undefined, { weekday: "short" });
              return <span key={h.date}>{label}</span>;
            })}
          </div>
        </div>

        {/* Quick Operations & Low Stock warnings sidebar */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 flex flex-col justify-between hover:border-primary/10 transition-all shadow-sm">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-wide">Quick Operations</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/admin/products/new"
                className="p-3 bg-secondary/25 dark:bg-secondary/15 hover:bg-secondary/45 border border-border/25 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold block text-foreground">Add Product</span>
                <span className="text-[8px] text-muted-foreground font-light block leading-tight mt-0.5">Generate SKUs</span>
              </Link>
              <Link
                href="/admin/inventory"
                className="p-3 bg-secondary/25 dark:bg-secondary/15 hover:bg-secondary/45 border border-border/25 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <Boxes className="w-4.5 h-4.5 text-accent mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold block text-foreground">Adjust Stock</span>
                <span className="text-[8px] text-muted-foreground font-light block leading-tight mt-0.5">Manual logs</span>
              </Link>
              <Link
                href="/admin/collections"
                className="p-3 bg-secondary/25 dark:bg-secondary/15 hover:bg-secondary/45 border border-border/25 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <Compass className="w-4.5 h-4.5 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold block text-foreground">Collections</span>
                <span className="text-[8px] text-muted-foreground font-light block leading-tight mt-0.5">Compilers</span>
              </Link>
              <Link
                href="/admin/settings/general"
                className="p-3 bg-secondary/25 dark:bg-secondary/15 hover:bg-secondary/45 border border-border/25 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <Settings className="w-4.5 h-4.5 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold block text-foreground">System Setup</span>
                <span className="text-[8px] text-muted-foreground font-light block leading-tight mt-0.5">General/SMTP</span>
              </Link>
            </div>
          </div>

          <div className="pt-6 border-t border-border/30 mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Low Stock warnings
              </span>
              <Link href="/admin/inventory" className="text-[9px] text-primary hover:underline font-light flex items-center">
                Manage Stock
                <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {stats.lowStockItems.length === 0 ? (
                <p className="text-[10px] text-muted-foreground font-light italic">All variants are sufficiently stocked.</p>
              ) : (
                stats.lowStockItems.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between text-xs font-light">
                    <span className="truncate max-w-[150px] text-foreground font-medium" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded-md font-semibold">
                      {item.stock} left
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-wide">Recent Orders</h3>
            <p className="text-[10px] text-muted-foreground font-light">
              Overview of the latest customer purchases.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-[10px] text-primary hover:underline font-light flex items-center"
          >
            All Orders
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-light border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Fulfillment Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground font-light italic">
                    No orders received yet.
                  </td>
                </tr>
              ) : (
                stats.recentOrders.map((order) => {
                  const clientName = order.user?.name || order.user?.phoneNumber || "Guest Customer";
                  
                  return (
                    <tr key={order.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                      <td className="py-3 px-4 font-mono font-bold text-foreground text-xs">{order.id}</td>
                      <td className="py-3 px-4 text-foreground font-medium">{clientName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(order.createdAt)}</td>
                      <td className="py-3 px-4 font-bold text-foreground">{formatPriceDecimal(order.totalAmount)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider inline-block ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
