"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Common formatting helpers
const formatPrice = (paise: number) => {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

const formatPriceDecimal = (paise: number) => {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatDateLabel = (dateStr: string) => {
  if (!dateStr) return "";
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

/* =========================================================================
   1. Revenue Trend Chart
   ========================================================================= */
interface RevenueTrendChartProps {
  salesHistory: any[];
  setActiveRevenuePoint: (point: any) => void;
}

export function RevenueTrendChart({ salesHistory, setActiveRevenuePoint }: RevenueTrendChartProps) {
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
  );
}

/* =========================================================================
   2. Orders Trend Chart
   ========================================================================= */
interface OrdersTrendChartProps {
  ordersHistory: any[];
  setActiveOrderPoint: (point: any) => void;
}

export function OrdersTrendChart({ ordersHistory, setActiveOrderPoint }: OrdersTrendChartProps) {
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

  return (
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
  );
}

/* =========================================================================
   3. Order Status Donut Chart
   ========================================================================= */
interface OrderStatusPieChartProps {
  totalOrders: number;
  statuses: any[];
  hoveredStatus: string | null;
  setHoveredStatus: (status: string | null) => void;
}

export function OrderStatusPieChart({
  totalOrders,
  statuses,
  hoveredStatus,
  setHoveredStatus,
}: OrderStatusPieChartProps) {
  const getStatusPercent = (count: number) => {
    if (totalOrders === 0) return 0;
    return (count / totalOrders) * 100;
  };

  const StatusTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.key === "none") return null;
      const pct = getStatusPercent(data.value);
      return (
        <div className="bg-card/95 backdrop-blur-md border border-border/40 px-3 py-2 rounded-2xl shadow-xl flex flex-col gap-0.5 text-xs font-light">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-semibold text-foreground">{data.name}</span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground pl-3">
            {data.value} orders ({pct.toFixed(0)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const chartData = totalOrders === 0
    ? [{ name: "No Orders", value: 1, color: "var(--border)", key: "none" }]
    : statuses
        .filter(s => s.count > 0)
        .map(s => ({
          name: s.label,
          value: s.count,
          color: s.hex,
          key: s.key,
        }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={70}
          paddingAngle={
            totalOrders > 0 && statuses.filter(s => s.count > 0).length > 1 ? 3 : 0
          }
          dataKey="value"
          onMouseEnter={(_, index) => {
            if (totalOrders > 0) {
              const activeStatuses = statuses.filter(s => s.count > 0);
              if (activeStatuses[index]) {
                setHoveredStatus(activeStatuses[index].key);
              }
            }
          }}
          onMouseLeave={() => {
            setHoveredStatus(null);
          }}
        >
          {chartData.map((entry, index) => {
            const isHovered = hoveredStatus === entry.key;
            return (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color} 
                opacity={hoveredStatus === null || isHovered ? 1 : 0.4}
                className="transition-all duration-300 cursor-pointer"
                style={{ outline: "none" }}
              />
            );
          })}
        </Pie>
        <Tooltip content={<StatusTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* =========================================================================
   4. Wishlist Additions Trend Chart
   ========================================================================= */
interface WishlistTrendChartProps {
  wishlistHistory: any[];
  totalWishlistAdds: number;
}

export function WishlistTrendChart({ wishlistHistory, totalWishlistAdds }: WishlistTrendChartProps) {
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
  );
}

/* =========================================================================
   5. Customer Acquisition Chart
   ========================================================================= */
interface CustomerAcquisitionChartProps {
  acquisitionHistory: any[];
}

export function CustomerAcquisitionChart({ acquisitionHistory }: CustomerAcquisitionChartProps) {
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
  );
}
