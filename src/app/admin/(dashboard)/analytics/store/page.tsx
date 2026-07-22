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
  Inbox,
  Award,
  AlertTriangle,
  Boxes,
  Heart,
  Users,
  Tag,
  Search
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

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

// Types for Product Analytics
interface TopProductItem {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
}

interface TopVariantItem {
  id: string;
  sku: string;
  name: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}

interface CategoryDistItem {
  categoryId: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
}

interface TrendingProductItem {
  id: string;
  name: string;
  slug: string;
  qtyA: number;
  qtyB: number;
  growthPercent: number;
}

interface ProductsAnalyticsResponse {
  topProducts: TopProductItem[];
  topVariants: TopVariantItem[];
  categoryDistribution: CategoryDistItem[];
  trendingProducts: TrendingProductItem[];
  trendingLabel?: string;
}

// Types for Stock Alerts
interface StockAlertItem {
  id: string;
  variantId: string;
  sku: string;
  variantName: string;
  productName: string;
  stockLevel: number;
  reservedQuantity: number;
  availableStock: number;
  lowStockThreshold: number;
  price: number;
  restockQty: number;
  restockCost: number;
}

interface StockAnalyticsResponse {
  summary: {
    lowStockCount: number;
    outOfStockCount: number;
    totalRestockCost: number;
  };
  lowStockItems: StockAlertItem[];
  outOfStockItems: StockAlertItem[];
}

// Types for Wishlist Analytics
interface WishlistHistoryItem {
  date: string;
  count: number;
}

interface TopWishlistItem {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  addCount: number;
  conversionRate: number;
}

interface WishlistAnalyticsResponse {
  summary: {
    totalWishlistAdds: number;
    uniqueEngagedUsers: number;
    globalConversionRate: number;
  };
  wishlistHistory: WishlistHistoryItem[];
  topWishlisted: TopWishlistItem[];
}

// Types for Customer Analytics
interface AcquisitionHistoryItem {
  date: string;
  count: number;
}

interface VIPSpenderItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
}

interface CustomerAnalyticsResponse {
  summary: {
    totalSignups: number;
    periodSignups: number;
    repeatPurchaseRate: number;
    averageLTV: number;
    returningRevenuePercent: number;
    returningRevenueTotal: number;
  };
  acquisitionHistory: AcquisitionHistoryItem[];
  topSpenders: VIPSpenderItem[];
}

// Types for Coupon Analytics
interface CouponPerformanceItem {
  code: string;
  usageCount: number;
  totalDiscount: number;
  influencedRevenue: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  isActive: boolean;
}

interface CouponAnalyticsResponse {
  summary: {
    totalDiscountValue: number;
    influencedRevenue: number;
    usageCount: number;
    avgDiscountPerOrder: number;
  };
  couponPerformances: CouponPerformanceItem[];
}

// Types for Search Analytics
interface SearchLogItem {
  query: string;
  count: number;
  avgResults?: number;
}

interface RecentLogItem {
  id: string;
  query: string;
  resultsCount: number;
  ipAddress: string | null;
  createdAt: string;
}

interface SearchAnalyticsResponse {
  popular: SearchLogItem[];
  recent: RecentLogItem[];
  failed: SearchLogItem[];
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("revenue"); // "revenue" | "orders"
  const [dateRange, setDateRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(true);

  // Loaded data states
  const [revenueData, setRevenueData] = useState<AnalyticsResponse | null>(null);
  const [ordersData, setOrdersData] = useState<OrdersAnalyticsResponse | null>(null);
  const [productsData, setProductsData] = useState<ProductsAnalyticsResponse | null>(null);
  const [stockData, setStockData] = useState<StockAnalyticsResponse | null>(null);
  const [wishlistData, setWishlistData] = useState<WishlistAnalyticsResponse | null>(null);
  const [customerData, setCustomerData] = useState<CustomerAnalyticsResponse | null>(null);
  const [couponData, setCouponData] = useState<CouponAnalyticsResponse | null>(null);
  const [searchAnalyticsData, setSearchAnalyticsData] = useState<SearchAnalyticsResponse | null>(null);

  // Active chart hover points
  const [activeRevenuePoint, setActiveRevenuePoint] = useState<any | null>(null);
  const [activeOrderPoint, setActiveOrderPoint] = useState<any | null>(null);
  const [activeWishlistPoint, setActiveWishlistPoint] = useState<any | null>(null);
  const [activeCustomerPoint, setActiveCustomerPoint] = useState<any | null>(null);

  // Fetch data depending on activeTab & range
  async function loadAnalytics() {
    setIsLoading(true);
    try {
      if (activeTab === "revenue") {
        const res = await fetch(`/api/admin/analytics/revenue?range=${dateRange}`);
        if (res.ok) {
          setRevenueData(await res.json());
        }
      } else if (activeTab === "orders") {
        const res = await fetch(`/api/admin/analytics/orders?range=${dateRange}`);
        if (res.ok) {
          setOrdersData(await res.json());
        }
      } else if (activeTab === "products") {
        const res = await fetch(`/api/admin/analytics/products?range=${dateRange}`);
        if (res.ok) {
          setProductsData(await res.json());
        }
      } else if (activeTab === "stock") {
        const res = await fetch(`/api/admin/analytics/inventory`);
        if (res.ok) {
          setStockData(await res.json());
        }
      } else if (activeTab === "wishlist") {
        const res = await fetch(`/api/admin/analytics/wishlists?range=${dateRange}`);
        if (res.ok) {
          setWishlistData(await res.json());
        }
      } else if (activeTab === "customers") {
        const res = await fetch(`/api/admin/analytics/customers?range=${dateRange}`);
        if (res.ok) {
          setCustomerData(await res.json());
        }
      } else if (activeTab === "coupons") {
        const res = await fetch(`/api/admin/analytics/coupons?range=${dateRange}`);
        if (res.ok) {
          setCouponData(await res.json());
        }
      } else {
        const res = await fetch(`/api/admin/settings/search-analytics`);
        if (res.ok) {
          setSearchAnalyticsData(await res.json());
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
    setActiveWishlistPoint(null);
    setActiveCustomerPoint(null);
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

    const RevenueTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-card/95 backdrop-blur-md border border-border/40 px-3 py-2 rounded-2xl shadow-xl flex flex-col gap-0.5 text-xs font-light">
            <p className="font-medium text-foreground">{formatDateLabel(data.date)}</p>
            <p className="font-bold text-primary">{formatPriceDecimal(data.amount)}</p>
            <p className="text-muted-foreground text-[10px] font-light">({data.count} orders)</p>
          </div>
        );
      }
      return null;
    };

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
              <p className="text-2xl font-semibold tracking-wide text-foreground">
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
              <p className="text-2xl font-semibold tracking-wide text-foreground">
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
              <p className="text-2xl font-semibold tracking-wide text-foreground">
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
              <p className="text-lg font-semibold tracking-wide text-foreground">
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border border-border rounded-xl text-[10px]">
                <span className="font-medium text-foreground">{formatDateLabel(activeRevenuePoint.date)}:</span>
                <span className="font-bold text-primary">{formatPriceDecimal(activeRevenuePoint.amount)}</span>
                <span className="text-muted-foreground font-light">({activeRevenuePoint.count} orders)</span>
              </div>
            )}
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={salesHistory}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                onMouseMove={(e: any) => {
                  if (e.activePayload && e.activePayload.length) {
                    setActiveRevenuePoint(e.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setActiveRevenuePoint(null)}
              >
                <defs>
                  <linearGradient id="revenueChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.00} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="4 4" 
                  vertical={false} 
                  stroke="var(--border)" 
                  opacity={0.15}
                />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(str) => formatDateLabel(str)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "monospace" }}
                  dy={10}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatPrice(val)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "monospace" }}
                  dx={-5}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="var(--primary)" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#revenueChartGradient)"
                  activeDot={{ r: 6, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2.5 }}
                  dot={{ r: 3.5, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
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

    const OrdersTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-card/95 backdrop-blur-md border border-border/40 px-3 py-2 rounded-2xl shadow-xl flex flex-col gap-0.5 text-xs font-light">
            <p className="font-medium text-foreground">{formatDateLabel(data.date)}</p>
            <p className="font-bold text-primary">{data.count} Orders</p>
          </div>
        );
      }
      return null;
    };

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
      { key: "delivered", label: "Delivered", count: summary.statusBreakdown.delivered, bg: "bg-emerald-500", text: "text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30" },
      { key: "shipped", label: "Shipped", count: summary.statusBreakdown.shipped, bg: "bg-sky-500", text: "text-sky-800 dark:text-sky-300 bg-sky-500/15 border-sky-500/30" },
      { key: "processing", label: "Processing", count: summary.statusBreakdown.processing, bg: "bg-orange-500", text: "text-orange-800 dark:text-orange-300 bg-orange-500/15 border-orange-500/30" },
      { key: "paid", label: "Paid Checkouts", count: summary.statusBreakdown.paid, bg: "bg-emerald-500", text: "text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30" },
      { key: "pending", label: "Pending Payment", count: summary.statusBreakdown.pending, bg: "bg-amber-500", text: "text-amber-800 dark:text-amber-300 bg-amber-500/15 border-amber-500/30" },
      { key: "refunded", label: "Refunded", count: summary.statusBreakdown.refunded, bg: "bg-purple-500", text: "text-purple-800 dark:text-purple-300 bg-purple-500/15 border-purple-500/30" },
      { key: "cancelled", label: "Cancelled", count: summary.statusBreakdown.cancelled, bg: "bg-rose-500", text: "text-rose-800 dark:text-rose-300 bg-rose-500/15 border-rose-500/30" }
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border border-border rounded-xl text-[10px]">
                  <span className="font-medium text-foreground">{formatDateLabel(activeOrderPoint.date)}:</span>
                  <span className="font-bold text-primary">{activeOrderPoint.count} Orders</span>
                </div>
              )}
            </div>

            <div className="h-56 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={ordersHistory}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  onMouseMove={(e: any) => {
                    if (e.activePayload && e.activePayload.length) {
                      setActiveOrderPoint(e.activePayload[0].payload);
                    }
                  }}
                  onMouseLeave={() => setActiveOrderPoint(null)}
                >
                  <defs>
                    <linearGradient id="ordersChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.00} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="4 4" 
                    vertical={false} 
                    stroke="var(--border)" 
                    opacity={0.15}
                  />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(str) => formatDateLabel(str)}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "monospace" }}
                    dy={10}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => Math.round(val).toString()}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "monospace" }}
                    dx={-5}
                  />
                  <Tooltip content={<OrdersTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="var(--primary)" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#ordersChartGradient)"
                    activeDot={{ r: 6, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2.5 }}
                    dot={{ r: 3.5, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
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

  // 3. Best Sellers tab rendering
  const renderProductsTab = () => {
    if (!productsData) return null;
    const { topProducts, topVariants, categoryDistribution, trendingProducts } = productsData;

    const totalCategoryRevenue = categoryDistribution.reduce((acc, c) => acc + c.revenue, 0);

    return (
      <div className="space-y-6">
        {/* Trending & Category Distributions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category distribution splits */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 lg:col-span-2 hover:border-primary/10 transition-all shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-foreground">Category Performance Splits</h3>
              <p className="text-[10px] text-muted-foreground font-light font-sans">
                Distribution of sales revenue and quantities split by catalog categories.
              </p>
            </div>
            
            <div className="space-y-4">
              {categoryDistribution.length === 0 ? (
                <p className="text-xs text-muted-foreground font-light italic">No category sales recorded in this period.</p>
              ) : (
                categoryDistribution.map((c) => {
                  const sharePercent = totalCategoryRevenue > 0 ? (c.revenue / totalCategoryRevenue) * 100 : 0;
                  return (
                    <div key={c.categoryId} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-foreground">{c.categoryName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {c.quantitySold} units | {formatPriceDecimal(c.revenue)} ({sharePercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary/40 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500" 
                          style={{ width: `${sharePercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Trending products list */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/10 transition-all shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-accent animate-pulse" />
                Trending Spikes
              </h3>
              <p className="text-[10px] text-muted-foreground font-light font-sans">
                Highest sales velocity percentage growth ({productsData.trendingLabel || "7d vs previous 7d"}).
              </p>
            </div>

            <div className="space-y-3 flex-1 justify-center flex flex-col">
              {trendingProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground font-light italic py-8 text-center">No trending spikes detected in this period.</p>
              ) : (
                trendingProducts.map((p) => (
                  <div key={p.id} className="flex justify-between items-center border-b border-border/10 pb-2 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[170px] block" title={p.name}>
                        {p.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-light block">
                        Sales: {p.qtyB} units → {p.qtyA} units
                      </span>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      +{p.growthPercent.toFixed(0)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Top Products & Top Variants splits grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Products */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/10 transition-all shadow-sm space-y-4">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Top 10 Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground font-light italic">No sales recorded.</td>
                    </tr>
                  ) : (
                    topProducts.map((p) => (
                      <tr key={p.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                        <td className="py-2.5 px-3 font-medium text-foreground">{p.name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{p.categoryName}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-foreground">{p.quantitySold}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatPriceDecimal(p.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Selling Variants */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/10 transition-all shadow-sm space-y-4">
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Top 10 SKUs / Variants</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Variant details</th>
                    <th className="py-2.5 px-3 text-center">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topVariants.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground font-light italic">No sales recorded.</td>
                    </tr>
                  ) : (
                    topVariants.map((v) => (
                      <tr key={v.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                        <td className="py-2.5 px-3 font-mono font-bold text-foreground text-xs">{v.sku}</td>
                        <td className="py-2.5 px-3 text-foreground">
                          <span className="font-semibold block">{v.name}</span>
                          <span className="text-[9px] text-muted-foreground block">{v.productName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-foreground">{v.quantitySold}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatPriceDecimal(v.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 4. Stock Alerts tab rendering
  const renderStockTab = () => {
    if (!stockData) return null;
    const { summary, lowStockItems, outOfStockItems } = stockData;

    let healthText = "Healthy";
    let healthColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (summary.outOfStockCount > 0) {
      healthText = "Attention Needed";
      healthColor = "text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse";
    } else if (summary.lowStockCount > 0) {
      healthText = "Action Recommended";
      healthColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }

    return (
      <div className="space-y-6">
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Out of Stock Count */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-rose-500/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-rose-500/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Out of Stock SKUs</span>
              <div className={`p-2 rounded-2xl group-hover:scale-105 transition-all ${
                summary.outOfStockCount > 0 ? "text-rose-500 bg-rose-500/10 animate-pulse" : "text-muted-foreground bg-secondary"
              }`}>
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className={`font-serif text-2xl font-semibold tracking-wide ${summary.outOfStockCount > 0 ? "text-rose-500 font-bold" : "text-foreground"}`}>
                {summary.outOfStockCount} SKUs
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Variants requiring immediate restocking</p>
            </div>
          </div>

          {/* Low Stock Count */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-amber-500/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-amber-500/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Low Stock SKUs</span>
              <div className={`p-2 rounded-2xl group-hover:scale-105 transition-all ${
                summary.lowStockCount > 0 ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground bg-secondary"
              }`}>
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className={`font-serif text-2xl font-semibold tracking-wide ${summary.lowStockCount > 0 ? "text-amber-500 font-bold" : "text-foreground"}`}>
                {summary.lowStockCount} SKUs
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Variants near reorder thresholds</p>
            </div>
          </div>

          {/* Reorder Investment */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Replenishment Cost</span>
              <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {formatPriceDecimal(summary.totalRestockCost)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Est. cost to replenish low/out variants</p>
            </div>
          </div>

          {/* System Health Status */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-secondary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inventory Health</span>
              <div className="p-2 rounded-2xl text-secondary-foreground bg-secondary group-hover:scale-105 transition-all">
                <Boxes className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className={`px-3 py-1.5 text-center font-bold text-[10px] border rounded-xl inline-block uppercase tracking-wider ${healthColor}`}>
                {healthText}
              </div>
              <p className="text-[10px] text-muted-foreground font-light mt-1.5 block font-sans">Catalog stock replenishment health</p>
            </div>
          </div>
        </div>

        {/* Tables grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Out of Stock table */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-rose-500/10 transition-all shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Out of Stock Catalog
              </h3>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                Replenishment Critical
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Variant Details</th>
                    <th className="py-2.5 px-3 text-center">Reservations</th>
                    <th className="py-2.5 px-3 text-right">Replenish</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {outOfStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground font-light italic">All catalog items have stock. Healthy state.</td>
                    </tr>
                  ) : (
                    outOfStockItems.map((v) => (
                      <tr key={v.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                        <td className="py-2.5 px-3 font-mono font-bold text-xs text-foreground">{v.sku}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold block text-foreground text-xs">{v.variantName}</span>
                          <span className="text-[9px] text-muted-foreground block">{v.productName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">{v.reservedQuantity}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-bold text-rose-500 block">+{v.restockQty} units</span>
                          <span className="text-[9px] text-muted-foreground block">{formatPriceDecimal(v.restockCost)} est</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <a 
                            href={`/admin/inventory?q=${encodeURIComponent(v.sku)}`}
                            className="inline-flex items-center px-2.5 py-1 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 text-[9px] font-semibold uppercase tracking-wider text-secondary rounded-lg transition-all"
                          >
                            Restock
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock table */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-amber-500/10 transition-all shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Low Stock Catalog
              </h3>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Replenishment Recommended
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Variant Details</th>
                    <th className="py-2.5 px-3 text-center">Stock / Alert</th>
                    <th className="py-2.5 px-3 text-right">Replenish</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground font-light italic">No low-stock items registered.</td>
                    </tr>
                  ) : (
                    lowStockItems.map((v) => (
                      <tr key={v.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                        <td className="py-2.5 px-3 font-mono font-bold text-xs text-foreground">{v.sku}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold block text-foreground text-xs">{v.variantName}</span>
                          <span className="text-[9px] text-muted-foreground block">{v.productName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-foreground font-semibold">
                          {v.availableStock} <span className="text-muted-foreground font-light text-[9px]">/ {v.lowStockThreshold}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-bold text-amber-500 block">+{v.restockQty} units</span>
                          <span className="text-[9px] text-muted-foreground block">{formatPriceDecimal(v.restockCost)} est</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <a 
                            href={`/admin/inventory?q=${encodeURIComponent(v.sku)}`}
                            className="inline-flex items-center px-2.5 py-1 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 text-[9px] font-semibold uppercase tracking-wider text-secondary rounded-lg transition-all"
                          >
                            Restock
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 5. Wishlists tab rendering
  const renderWishlistTab = () => {
    if (!wishlistData) return null;
    const { summary, wishlistHistory, topWishlisted } = wishlistData;

    const WishlistTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-card/95 backdrop-blur-md border border-border/40 px-3 py-2 rounded-2xl shadow-xl flex flex-col gap-0.5 text-xs font-light">
            <p className="font-medium text-foreground">{formatDateLabel(data.date)}</p>
            <p className="font-bold text-primary">{data.count} wishlist adds</p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Wishlist Additions */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wishlist Additions</span>
              <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
                <Heart className="w-4.5 h-4.5 fill-primary/10" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {summary.totalWishlistAdds} adds
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Total products wishlisted in this period</p>
            </div>
          </div>

          {/* Unique engaged users */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-secondary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Engaged Customers</span>
              <div className="p-2 rounded-2xl text-foreground bg-secondary group-hover:scale-105 transition-all">
                <Inbox className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {summary.uniqueEngagedUsers} users
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Unique shoppers saving to wishlists</p>
            </div>
          </div>

          {/* Wishlist to purchase conversion */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wishlist-to-Purchase Conversion</span>
              <div className="p-2 rounded-2xl text-accent bg-accent/10 group-hover:scale-105 transition-all">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {summary.globalConversionRate}%
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Rate of saved items ending in checkouts</p>
            </div>
          </div>
        </div>

        {/* Time-series interactive SVG line chart */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/10 transition-all shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Wishlist Additions Trend</h3>
            <p className="text-[10px] text-muted-foreground font-light font-sans">Daily wishlist addition counts showing customer purchase intent.</p>
          </div>

          <div className="h-56 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={wishlistHistory}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="wishlistChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.00} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="4 4" 
                  vertical={false} 
                  stroke="var(--border)" 
                  opacity={0.15}
                />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(str) => formatDateLabel(str)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "monospace" }}
                  dy={10}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => Math.round(val).toString()}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "monospace" }}
                  dx={-5}
                />
                <Tooltip content={<WishlistTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--primary)" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#wishlistChartGradient)"
                  activeDot={{ r: 6, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2.5 }}
                  dot={{ r: 3.5, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Wishlisted Products Table */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/10 transition-all shadow-sm space-y-4">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">Most Wishlisted Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Wishlist Adds</th>
                  <th className="py-2.5 px-3 text-center">Conversion Rate</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {topWishlisted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground font-light italic">No wishlist entries recorded in this period.</td>
                  </tr>
                ) : (
                  topWishlisted.map((p) => (
                    <tr key={p.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                      <td className="py-2.5 px-3 font-medium text-foreground">{p.name}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{p.categoryName}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-foreground">{p.addCount}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                          p.conversionRate >= 20 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : p.conversionRate > 0 
                              ? "bg-primary/10 text-primary border-primary/20" 
                              : "bg-secondary text-muted-foreground border-border/40"
                        }`}>
                          {p.conversionRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a 
                          href={`/products/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-2.5 py-1 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 text-[9px] font-semibold uppercase tracking-wider text-secondary rounded-lg transition-all"
                        >
                          View Live
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 6. Customer growth tab rendering
  const renderCustomerTab = () => {
    if (!customerData) return null;
    const { summary, acquisitionHistory, topSpenders } = customerData;

    const CustomersTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div className="bg-card/95 backdrop-blur-md border border-border/40 px-3 py-2 rounded-2xl shadow-xl flex flex-col gap-0.5 text-xs font-light">
            <p className="font-medium text-foreground">{formatDateLabel(data.date)}</p>
            <p className="font-bold text-primary">{data.count} signups</p>
          </div>
        );
      }
      return null;
    };

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Period Signups */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Customers Acquired</span>
              <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
                <Users className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {summary.periodSignups} signups
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">New customer registrations in range</p>
            </div>
          </div>

          {/* Returning Customer Revenue Share */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Returning Revenue Share</span>
              <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
                <TrendingUp className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {formatPriceDecimal(summary.returningRevenueTotal)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">
                Repeat customers spend share ({summary.returningRevenuePercent}%)
              </p>
            </div>
          </div>

          {/* Repeat purchase rate */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Repeat Purchase Rate</span>
              <div className="p-2 rounded-2xl text-accent bg-accent/10 group-hover:scale-105 transition-all">
                <Percent className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {summary.repeatPurchaseRate}%
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Customers with more than one checkout</p>
            </div>
          </div>

          {/* Customer Lifetime Value */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lifetime Value (LTV)</span>
              <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {formatPriceDecimal(summary.averageLTV)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Average lifetime order value per buyer</p>
            </div>
          </div>
        </div>

        {/* Time-series acquisition SVG line chart */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/10 transition-all shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-foreground">Customer Curve</h3>
            <p className="text-[10px] text-muted-foreground font-light font-sans">Daily curve of new customer sign-ups over the active period.</p>
          </div>

          <div className="h-56 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={acquisitionHistory}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="customersChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.00} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="4 4" 
                  vertical={false} 
                  stroke="var(--border)" 
                  opacity={0.15}
                />
                <XAxis 
                  dataKey="date" 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(str) => formatDateLabel(str)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "monospace" }}
                  dy={10}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => Math.round(val).toString()}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "monospace" }}
                  dx={-5}
                />
                <Tooltip content={<CustomersTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--primary)" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#customersChartGradient)"
                  activeDot={{ r: 6, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2.5 }}
                  dot={{ r: 3.5, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top VIP Spenders Table */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/10 transition-all shadow-sm space-y-4">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">Top 10 VIP Spenders</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Customer Details</th>
                  <th className="py-2.5 px-3">Contact Email</th>
                  <th className="py-2.5 px-3 text-center">Orders Count</th>
                  <th className="py-2.5 px-3 text-right">Lifetime Value spent</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {topSpenders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground font-light italic">No buyer data logged in Snail Studio history.</td>
                  </tr>
                ) : (
                  topSpenders.map((s) => (
                    <tr key={s.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold block text-foreground">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono block">{s.phone}</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{s.email}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-foreground font-mono">{s.orderCount}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatPriceDecimal(s.totalSpent)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <a 
                          href={`/admin/customers?q=${encodeURIComponent(s.phone)}`}
                          className="inline-flex items-center px-2.5 py-1 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 text-[9px] font-semibold uppercase tracking-wider text-secondary rounded-lg transition-all"
                        >
                          Customer File
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 7. Coupon performance rendering
  const renderCouponsTab = () => {
    if (!couponData) return null;
    const { summary, couponPerformances } = couponData;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Discount Value Generated */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Discount Value</span>
              <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
                <Percent className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {formatPriceDecimal(summary.totalDiscountValue)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Total coupon value deducted from cart totals</p>
            </div>
          </div>

          {/* Coupon-Influenced Order Revenue */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-secondary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Influenced Revenue</span>
              <div className="p-2 rounded-2xl text-foreground bg-secondary group-hover:scale-105 transition-all">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {formatPriceDecimal(summary.influencedRevenue)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Total revenue from checkouts using coupon codes</p>
            </div>
          </div>

          {/* Usage Count */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Coupon Usage</span>
              <div className="p-2 rounded-2xl text-accent bg-accent/10 group-hover:scale-105 transition-all">
                <Tag className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {summary.usageCount} checkouts
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Total count of successful coupon applications</p>
            </div>
          </div>

          {/* Average Discount per Order */}
          <div className="bg-card border border-border/40 rounded-3xl p-5 hover:border-primary/20 transition-all duration-300 group flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-primary/5 rounded-full translate-x-6 translate-y-6 pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg. Deducted Discount</span>
              <div className="p-2 rounded-2xl text-primary bg-primary/10 group-hover:scale-105 transition-all">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <p className="font-serif text-2xl font-semibold tracking-wide text-foreground">
                {formatPriceDecimal(summary.avgDiscountPerOrder)}
              </p>
              <p className="text-[10px] text-muted-foreground font-light font-sans">Average discount savings per checkout order</p>
            </div>
          </div>
        </div>

        {/* Coupons Performance List Table */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 hover:border-primary/10 transition-all shadow-sm space-y-4">
          <h3 className="text-sm font-semibold tracking-wide text-foreground">Active Coupon Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Coupon Code</th>
                  <th className="py-2.5 px-3">Discount Details</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Times Used</th>
                  <th className="py-2.5 px-3 text-right">Total Discount Value</th>
                  <th className="py-2.5 px-3 text-right">Influenced Revenue</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {couponPerformances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground font-light italic">No coupons logged or active in this time frame.</td>
                  </tr>
                ) : (
                  couponPerformances.map((c) => (
                    <tr key={c.code} className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all">
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-foreground text-xs uppercase bg-secondary/85 px-2 py-1 rounded-lg border border-border/30 inline-block">
                          {c.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs text-foreground font-semibold">
                          {c.discountType === "percentage" ? `${c.discountValue}% Off` : `${formatPriceDecimal(c.discountValue)} Off`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider inline-block ${
                          c.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        }`}>
                          {c.isActive ? "Active" : "Expired"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-foreground font-mono">{c.usageCount}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatPriceDecimal(c.totalDiscount)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">{formatPriceDecimal(c.influencedRevenue)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <a 
                          href={`/admin/coupons?q=${encodeURIComponent(c.code)}`}
                          className="inline-flex items-center px-2.5 py-1 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 text-[9px] font-semibold uppercase tracking-wider text-secondary rounded-lg transition-all"
                        >
                          Manage Coupon
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 8. Search analytics tab rendering
  const renderSearchAnalyticsTab = () => {
    if (!searchAnalyticsData) return null;
    const { popular, failed, recent } = searchAnalyticsData;

    const formatDateString = (isoStr: string) => {
      try {
        const date = new Date(isoStr);
        return date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });
      } catch {
        return isoStr;
      }
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Searches */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/10 pb-3">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Top Trending Search Terms
              </h3>
            </div>
            {popular.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-light">
                  <thead>
                    <tr className="border-b border-border/10 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                      <th className="py-2 px-1">Query</th>
                      <th className="py-2 text-center">Frequency</th>
                      <th className="py-2 text-right px-1">Avg. Results Found</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/5">
                    {popular.map((item, idx) => (
                      <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                        <td className="py-2.5 px-1 font-medium text-foreground capitalize">
                          {item.query}
                        </td>
                        <td className="py-2.5 text-center text-muted-foreground">
                          {item.count}
                        </td>
                        <td className="py-2.5 text-right font-medium text-foreground px-1">
                          {item.avgResults}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/80 font-light italic py-8 text-center">
                No searches recorded yet.
              </p>
            )}
          </div>

          {/* Failed Searches (0 Results) */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/10 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Missed Searches (0 Results Found)
              </h3>
            </div>
            {failed.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-light">
                  <thead>
                    <tr className="border-b border-border/10 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                      <th className="py-2 px-1">Query</th>
                      <th className="py-2 text-right px-1">Missed Search Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/5">
                    {failed.map((item, idx) => (
                      <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                        <td className="py-2.5 px-1 font-medium text-amber-600 dark:text-amber-500 capitalize flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          {item.query}
                        </td>
                        <td className="py-2.5 text-right font-medium text-foreground px-1">
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/80 font-light italic py-8 text-center">
                Great! No queries returned 0 results yet.
              </p>
            )}
          </div>
        </div>

        {/* Recent Searches */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 hover:border-primary/10 transition-all shadow-sm">
          <div className="flex items-center gap-2 border-b border-border/10 pb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Recent Search Activity Logs
            </h3>
          </div>
          {recent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light">
                <thead>
                  <tr className="border-b border-border/10 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                    <th className="py-2 px-1">Time</th>
                    <th className="py-2">Search Query</th>
                    <th className="py-2 text-center">Results Returned</th>
                    <th className="py-2 text-right px-1">Client IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {recent.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="py-2.5 px-1 text-muted-foreground font-light">
                        {formatDateString(item.createdAt)}
                      </td>
                      <td className="py-2.5 font-medium text-foreground capitalize">
                        {item.query}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.resultsCount > 0
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {item.resultsCount} items
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-muted-foreground px-1">
                        {item.ipAddress || "127.0.0.1"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/80 font-light italic py-8 text-center">
              No searches logged yet.
            </p>
          )}
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
        <button
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "products"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <Award className="w-4 h-4" />
          Best Sellers
        </button>
        <button
          onClick={() => setActiveTab("stock")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "stock"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <Boxes className="w-4 h-4" />
          Stock Alerts
        </button>
        <button
          onClick={() => setActiveTab("wishlist")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "wishlist"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <Heart className="w-4 h-4" />
          Wishlists
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "customers"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Customers
        </button>
        <button
          onClick={() => setActiveTab("coupons")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "coupons"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <Tag className="w-4 h-4" />
          Coupons
        </button>
        <button
          onClick={() => setActiveTab("searches")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "searches"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <Search className="w-4 h-4" />
          Searches
        </button>
      </div>

      {/* Dynamic Tab Body content */}
      {isLoading ? (
        <div className="h-96 w-full flex flex-col items-center justify-center gap-3 text-muted-foreground bg-card border border-border/40 rounded-3xl shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-light">Compiling ledger intelligence...</p>
        </div>
      ) : activeTab === "revenue" ? (
        renderRevenueTab()
      ) : activeTab === "orders" ? (
        renderOrdersTab()
      ) : activeTab === "products" ? (
        renderProductsTab()
      ) : activeTab === "stock" ? (
        renderStockTab()
      ) : activeTab === "wishlist" ? (
        renderWishlistTab()
      ) : activeTab === "customers" ? (
        renderCustomerTab()
      ) : activeTab === "coupons" ? (
        renderCouponsTab()
      ) : (
        renderSearchAnalyticsTab()
      )}
    </div>
  );
}
