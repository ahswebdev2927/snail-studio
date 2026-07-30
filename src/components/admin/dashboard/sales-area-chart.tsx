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
} from "recharts";

interface SalesHistoryItem {
  date: string;
  amount: number;
}

interface SalesAreaChartProps {
  salesHistory: SalesHistoryItem[];
}

export default function SalesAreaChart({ salesHistory }: SalesAreaChartProps) {
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

  // Custom tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/90 backdrop-blur-md border border-border/40 px-3 py-2 rounded-2xl shadow-xl flex flex-col gap-0.5 text-xs font-light">
          <p className="font-medium text-foreground">
            {new Date(data.date).toLocaleDateString("en-IN", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="font-bold text-primary">
            {formatPriceDecimal(data.amount)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={salesHistory}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="dashboardChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.00} />
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="4 4" 
          vertical={false} 
          stroke="var(--border)" 
          opacity={0.2}
        />
        <XAxis 
          dataKey="date" 
          tickLine={false}
          axisLine={false}
          tickFormatter={(str) => new Date(str).toLocaleDateString("en-IN", { weekday: "short" })}
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
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey="amount" 
          stroke="var(--primary)" 
          strokeWidth={2.5}
          fillOpacity={1} 
          fill="url(#dashboardChartGradient)"
          activeDot={{ r: 6, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2.5 }}
          dot={{ r: 3.5, fill: "var(--background)", stroke: "var(--primary)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
