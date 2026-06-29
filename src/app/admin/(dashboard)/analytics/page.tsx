"use client";

import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Percent, 
  Loader2,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  Sparkles,
  Inbox
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

// Types for Revenue Analytics
interface SummaryData {
  grossRevenue: number;
  refundsTotal: number;
  netRevenue: number;
  aov: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  orderCount: number;
}

interface SalesHistoryItem {
  date: string;
  amount: number;
  count: number;
}

interface AnalyticsResponse {
  summary: SummaryData;
  salesHistory: SalesHistoryItem[];
}

// Types for Orders Analytics
interface OrdersSummaryData {
  totalOrders: number;
  fulfillmentRate: number;
  averageFulfillmentHours: number;
  pendingFulfillmentCount: number;
  statusBreakdown: {
    pending: number;
    paid: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  };
}

interface OrdersHistoryItem {
  date: string;
  count: number;
}

interface OrdersAnalyticsResponse {
  summary: OrdersSummaryData;
  ordersHistory: OrdersHistoryItem[];
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("revenue"); // "revenue" | "orders"
  const [dateRange, setDateRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(true);

  // Loaded data states
  const [revenueData, setRevenueData] = useState<AnalyticsResponse | null>(null);
  const [ordersData, setOrdersData] = useState<OrdersAnalyticsResponse | null>(null);

  // Active chart hover points
  const [activeRevenuePoint, setActiveRevenuePoint] = useState<any | null>(null);
  const [activeOrderPoint, setActiveOrderPoint] = useState<any | null>(null);

  // Fetch data depending on activeTab & range
  async function loadAnalytics() {
    setIsLoading(true);
    try {
      if (activeTab === "revenue") {
        const res = await fetch(`/api/admin/analytics/revenue?range=${dateRange}`);
        if (res.ok) {
          setRevenueData(await res.json());
        }
      } else {
        const res = await fetch(`/api/admin/analytics/orders?range=${dateRange}`);
        if (res.ok) {
          setOrdersData(await res.json());
        }
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
    // Reset active hover points on tab or range changes
    setActiveRevenuePoint(null);
    setActiveOrderPoint(null);
  }, [activeTab, dateRange]);

  const formatPriceDecimal = (paise: number) => {
    return `₹${(paise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDateLabel = (dateStr: string) => {
    if (dateStr.length === 7) {
      const [year, month] = dateStr.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    }
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // 1. Revenue tab rendering
  const renderRevenueTab = () => {
    if (!revenueData) return null;
    const { summary, salesHistory } = revenueData;

    // SVG Area Chart Configurations
    const chartWidth = 600;
    const chartHeight = 220;
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 35;

    const graphWidth = chartWidth - paddingLeft - paddingRight;
    const graphHeight = chartHeight - paddingTop - paddingBottom;

    const maxAmount = Math.max(...salesHistory.map(h => h.amount), 50000); // min scale to 500 INR to prevent flatline

    const points = salesHistory.map((h, idx) => {
      const x = paddingLeft + (idx / Math.max(salesHistory.length - 1, 1)) * graphWidth;
      const y = chartHeight - paddingBottom - (h.amount / maxAmount) * graphHeight;
      return { x, y, date: h.date, amount: h.amount, count: h.count };
    });

    const chartPointsStr = points.map(p => `${p.x},${p.y}`).join(" ");
    const chartFillPointsStr = `${paddingLeft},${chartHeight - paddingBottom} ${chartPointsStr} ${chartWidth - paddingRight},${chartHeight - paddingBottom}`;

    // Y-axis gridlines (0%, 25%, 50%, 75%, 100%)
    const yGridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
      const y = chartHeight - paddingBottom - pct * graphHeight;
      const value = pct * maxAmount;
      return { y, value };
    });

    return (
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-emerald-500/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net Revenue</span>
              <div className="p-2 rounded-2xl text-emerald-500 bg-emerald-500/10 group-hover:scale-105 transition-all">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {formatPriceDecimal(summary.netRevenue)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light">Gross: {formatPrice(summary.grossRevenue)} | Refund: {formatPrice(summary.refundsTotal)}</p>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AOV</span>
              <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {formatPriceDecimal(summary.aov)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light">Average net basket revenue per transaction</p>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-500/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Paid Orders</span>
              <div className="p-2 rounded-2xl text-blue-500 bg-blue-500/10 group-hover:scale-105 transition-all">
                <ShoppingBag className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {summary.orderCount} Orders
              </p>
              <p className="text-[10px] text-muted-foreground font-light">Completed checkouts in timeframe</p>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-accent/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-accent/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discounts & Fees</span>
              <div className="p-2 rounded-2xl text-accent bg-accent/10 group-hover:scale-105 transition-all">
                <Percent className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-lg font-semibold tracking-wide text-foreground">
                - {formatPrice(summary.discountAmount)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light">Tax: +{formatPrice(summary.taxAmount)} | Shipping: +{formatPrice(summary.shippingAmount)}</p>
            </div>
          </div>
        </div>

        {/* Sales Trend Chart */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-foreground">Chronological Sales Trend</h3>
              <p className="text-[10px] text-muted-foreground font-light">
                Interactive revenue trajectory chart (hover points to inspect daily metrics).
              </p>
            </div>
            {activeRevenuePoint && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/80 border border-border/60 rounded-xl text-[10px]">
                <span className="font-medium text-foreground">{formatDateLabel(activeRevenuePoint.date)}:</span>
                <span className="font-bold text-primary">{formatPriceDecimal(activeRevenuePoint.amount)}</span>
                <span className="text-muted-foreground font-light">({activeRevenuePoint.count} orders)</span>
              </div>
            )}
          </div>

          <div className="relative h-64 w-full flex items-end pt-4">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {yGridLines.map((line, idx) => (
                <g key={idx}>
                  <line 
                    x1={paddingLeft} 
                    y1={line.y} 
                    x2={chartWidth - paddingRight} 
                    y2={line.y} 
                    stroke="currentColor" 
                    className="text-border/20 dark:text-border/10" 
                    strokeWidth="0.5" 
                    strokeDasharray={idx === 0 ? "0" : "4 4"} 
                  />
                  <text 
                    x={paddingLeft - 10} 
                    y={line.y + 4} 
                    textAnchor="end" 
                    className="text-[9px] font-mono fill-muted-foreground"
                  >
                    {formatPrice(line.value)}
                  </text>
                </g>
              ))}

              <polygon points={chartFillPointsStr} fill="url(#chartGradient)" />

              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                points={chartPointsStr}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {points.map((p, idx) => {
                const isHovered = activeRevenuePoint?.date === p.date;
                return (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? "6" : "3.5"}
                      fill="hsl(var(--background))"
                      stroke={isHovered ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                      strokeWidth="2.5"
                      className="transition-all duration-150"
                    />
                    <rect
                      x={p.x - 15}
                      y={paddingTop}
                      width="30"
                      height={graphHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setActiveRevenuePoint(p)}
                      onMouseLeave={() => setActiveRevenuePoint(null)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between text-[9px] text-muted-foreground font-light px-1 font-mono pl-[55px]">
            {salesHistory.filter((_, idx) => {
              const count = salesHistory.length;
              if (count <= 7) return true;
              if (count <= 31) return idx % 5 === 0 || idx === count - 1;
              return idx % 30 === 0 || idx === count - 1;
            }).map((h) => (
              <span key={h.date}>{h.date.substring(5)}</span>
            ))}
          </div>
        </div>

        {/* Revenue Ledger Table */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all shadow-sm">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">Ledger Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Orders Count</th>
                  <th className="py-3 px-4 text-right">Revenue (Gross)</th>
                  <th className="py-3 px-4 text-right">AOV</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.slice().reverse().map((h) => {
                  const dayAOV = h.count > 0 ? h.amount / h.count : 0;
                  return (
                    <tr key={h.date} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                      <td className="py-3 px-4 font-mono text-foreground font-medium">
                        {formatDateLabel(h.date)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-semibold">
                        {h.count} orders
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatPriceDecimal(h.amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {formatPriceDecimal(dayAOV)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 2. Orders tab rendering
  const renderOrdersTab = () => {
    if (!ordersData) return null;
    const { summary, ordersHistory } = ordersData;

    // SVG Area Chart Configurations
    const chartWidth = 600;
    const chartHeight = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 35;

    const graphWidth = chartWidth - paddingLeft - paddingRight;
    const graphHeight = chartHeight - paddingTop - paddingBottom;

    const maxCount = Math.max(...ordersHistory.map(h => h.count), 5); // min scale to 5 orders to prevent flatline

    const points = ordersHistory.map((h, idx) => {
      const x = paddingLeft + (idx / Math.max(ordersHistory.length - 1, 1)) * graphWidth;
      const y = chartHeight - paddingBottom - (h.count / maxCount) * graphHeight;
      return { x, y, date: h.date, count: h.count };
    });

    const chartPointsStr = points.map(p => `${p.x},${p.y}`).join(" ");
    const chartFillPointsStr = `${paddingLeft},${chartHeight - paddingBottom} ${chartPointsStr} ${chartWidth - paddingRight},${chartHeight - paddingBottom}`;

    // Y-axis gridlines
    const yGridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
      const y = chartHeight - paddingBottom - pct * graphHeight;
      const value = Math.round(pct * maxCount);
      return { y, value };
    });

    // Formatting helper for duration hours
    const formatFulfillmentHours = (hours: number) => {
      if (hours === 0) return "N/A";
      if (hours < 24) return `${hours.toFixed(1)} hrs`;
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours.toFixed(0)}h`;
    };

    // Calculate percentage breakdown for progress bars
    const getStatusPercent = (count: number) => {
      if (summary.totalOrders === 0) return 0;
      return (count / summary.totalOrders) * 100;
    };

    // Status label map with descriptions & icons & color classes
    const statuses = [
      { key: "delivered", label: "Delivered", count: summary.statusBreakdown.delivered, bg: "bg-emerald-500", text: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
      { key: "shipped", label: "Shipped", count: summary.statusBreakdown.shipped, bg: "bg-blue-500", text: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
      { key: "processing", label: "Processing", count: summary.statusBreakdown.processing, bg: "bg-primary", text: "text-primary bg-primary/10 border-primary/20" },
      { key: "paid", label: "Paid Checkouts", count: summary.statusBreakdown.paid, bg: "bg-teal-500", text: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
      { key: "pending", label: "Pending Payment", count: summary.statusBreakdown.pending, bg: "bg-amber-500", text: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
      { key: "refunded", label: "Refunded", count: summary.statusBreakdown.refunded, bg: "bg-cyan-500", text: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
      { key: "cancelled", label: "Cancelled", count: summary.statusBreakdown.cancelled, bg: "bg-rose-500", text: "text-rose-500 bg-rose-500/10 border-rose-500/20" }
    ];

    return (
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order Volume</span>
              <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
                <ShoppingBag className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {summary.totalOrders} Orders
              </p>
              <p className="text-[10px] text-muted-foreground font-light">All checkout sessions initialized</p>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-emerald-500/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fulfillment Rate</span>
              <div className="p-2 rounded-2xl text-emerald-500 bg-emerald-500/10 group-hover:scale-105 transition-all">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {summary.fulfillmentRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground font-light">Delivered ratio of completed paid sales</p>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-500/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fulfillment Velocity</span>
              <div className="p-2 rounded-2xl text-blue-500 bg-blue-500/10 group-hover:scale-105 transition-all">
                <Clock className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {formatFulfillmentHours(summary.averageFulfillmentHours)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light">Avg time elapsed: Placed → Delivered</p>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-amber-500/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-amber-500/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Fulfillment</span>
              <div className={`p-2 rounded-2xl group-hover:scale-105 transition-all ${
                summary.pendingFulfillmentCount > 0 ? "text-amber-500 bg-amber-500/10 animate-pulse" : "text-muted-foreground bg-secondary"
              }`}>
                <Truck className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className={`font-serif text-2xl font-semibold tracking-wide ${
                summary.pendingFulfillmentCount > 0 ? "text-amber-500 font-bold" : "text-foreground"
              }`}>
                {summary.pendingFulfillmentCount} Orders
              </p>
              <p className="text-[10px] text-muted-foreground font-light">Fulfillment tasks: Paid / Process / Shipped</p>
            </div>
          </div>
        </div>

        {/* Trend & Status Breakdown Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders Volume Trend SVG Chart */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 lg:col-span-2 space-y-4 hover:border-primary/10 transition-all shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-foreground">Order Volume Velocity</h3>
                <p className="text-[10px] text-muted-foreground font-light">
                  Interactive order count timeline tracking purchase frequency.
                </p>
              </div>
              {activeOrderPoint && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/80 border border-border/60 rounded-xl text-[10px]">
                  <span className="font-medium text-foreground">{formatDateLabel(activeOrderPoint.date)}:</span>
                  <span className="font-bold text-primary">{activeOrderPoint.count} Orders</span>
                </div>
              )}
            </div>

            <div className="relative h-56 w-full flex items-end pt-4">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {yGridLines.map((line, idx) => (
                  <g key={idx}>
                    <line 
                      x1={paddingLeft} 
                      y1={line.y} 
                      x2={chartWidth - paddingRight} 
                      y2={line.y} 
                      stroke="currentColor" 
                      className="text-border/20 dark:text-border/10" 
                      strokeWidth="0.5" 
                      strokeDasharray={idx === 0 ? "0" : "4 4"} 
                    />
                    <text 
                      x={paddingLeft - 8} 
                      y={line.y + 4} 
                      textAnchor="end" 
                      className="text-[9px] font-mono fill-muted-foreground"
                    >
                      {line.value}
                    </text>
                  </g>
                ))}

                <polygon points={chartFillPointsStr} fill="url(#chartGradient)" />

                <polyline
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2.5"
                  points={chartPointsStr}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {points.map((p, idx) => {
                  const isHovered = activeOrderPoint?.date === p.date;
                  return (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? "6" : "3.5"}
                        fill="hsl(var(--background))"
                        stroke={isHovered ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                        strokeWidth="2.5"
                        className="transition-all duration-150"
                      />
                      <rect
                        x={p.x - 15}
                        y={paddingTop}
                        width="30"
                        height={graphHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setActiveOrderPoint(p)}
                        onMouseLeave={() => setActiveOrderPoint(null)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex justify-between text-[9px] text-muted-foreground font-light px-1 font-mono pl-[40px]">
              {ordersHistory.filter((_, idx) => {
                const count = ordersHistory.length;
                if (count <= 7) return true;
                if (count <= 31) return idx % 5 === 0 || idx === count - 1;
                return idx % 30 === 0 || idx === count - 1;
              }).map((h) => (
                <span key={h.date}>{h.date.substring(5)}</span>
              ))}
            </div>
          </div>

          {/* Status Breakdown Distribution Lists */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/10 transition-all shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-foreground">Status Distributions</h3>
              <p className="text-[10px] text-muted-foreground font-light">
                Ledger counts breakdown grouped by order fulfillment stages.
              </p>
            </div>

            <div className="space-y-3.5">
              {statuses.map(s => {
                const pct = getStatusPercent(s.count);
                return (
                  <div key={s.key} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[10px] font-medium text-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.bg}`} />
                        {s.label}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {s.count} orders ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    {/* Custom Premium Progress Bar */}
                    <div className="w-full h-1.5 bg-secondary/40 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${s.bg} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Orders Ledger Details table */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all shadow-sm">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">Chronological Orders Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Order counts registered</th>
                </tr>
              </thead>
              <tbody>
                {ordersHistory.slice().reverse().map((h) => (
                  <tr key={h.date} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                    <td className="py-3 px-4 font-mono text-foreground font-medium">
                      {formatDateLabel(h.date)}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">
                      {h.count} orders placed
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Time Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">
            Business Intelligence & <span className="font-serif italic font-light text-primary">Analytics</span>
          </h1>
          <p className="text-xs text-muted-foreground font-light font-sans">
            Store operations details and analytical summaries compiled from the ledger.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Refresh Button */}
          <button 
            onClick={loadAnalytics}
            title="Refresh Ledger"
            className="p-2.5 bg-secondary hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all cursor-pointer"
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
              <option value="ytd">Year to Date</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Selector Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab("revenue")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "revenue"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Revenue Dashboard
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "orders"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Orders Dashboard
        </button>
      </div>

      {/* Dynamic Tab Body content */}
      {isLoading ? (
        <div className="h-96 w-full flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card border border-border/40 rounded-3xl shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-light">Compiling dashboard intelligence...</p>
        </div>
      ) : activeTab === "revenue" ? (
        renderRevenueTab()
      ) : (
        renderOrdersTab()
      )}
    </div>
  );
}
