"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface FunnelItem {
  step: string;
  count: number;
  rate: number;
}

interface TrafficAnalyticsChartsProps {
  funnel: FunnelItem[];
}

export default function TrafficFunnelChart({ funnel = [] }: TrafficAnalyticsChartsProps) {
  const FunnelTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const idx = funnel.findIndex(item => item.step === data.step);
      const prevItem = idx > 0 ? funnel[idx - 1] : null;
      const dropoff = (prevItem && prevItem.count > 0) ? (100 - (data.count / prevItem.count) * 100) : null;

      return (
        <div className="bg-card/95 backdrop-blur-md border border-border/40 px-3 py-2 rounded-2xl shadow-xl flex flex-col gap-0.5 text-xs font-light">
          <p className="font-semibold text-foreground">{data.step}</p>
          <p className="font-bold text-primary">{data.count.toLocaleString()} visits</p>
          <p className="text-muted-foreground text-[10px]">Conversion Rate: {data.rate}%</p>
          {dropoff !== null && !isNaN(dropoff) && isFinite(dropoff) && (
            <p className="text-rose-500 text-[10px] font-semibold mt-0.5">
              ↓ {dropoff.toFixed(1)}% Drop-off rate
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={funnel}
        layout="vertical"
        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
      >
        <defs>
          <linearGradient id="funnelBarGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity="0.85" />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="4 4" 
          horizontal={false} 
          vertical={true}
          stroke="var(--border)" 
          opacity={0.15}
        />
        <XAxis 
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 9, fontFamily: "monospace" }}
        />
        <YAxis 
          type="category"
          dataKey="step"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
          width={120}
        />
        <Tooltip content={<FunnelTooltip />} />
        <Bar 
          dataKey="count" 
          fill="url(#funnelBarGradient)" 
          radius={[0, 6, 6, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
