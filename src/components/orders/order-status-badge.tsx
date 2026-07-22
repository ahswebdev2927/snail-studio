import React from "react";

export const getOrderStatusBadgeStyle = (status: string) => {
  switch (status?.toLowerCase()) {
    case "delivered":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
    case "shipped":
      return "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30";
    case "processing":
      return "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
    case "paid":
    case "confirmed":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
    case "cancelled":
      return "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30";
    case "refunded":
      return "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30";
    default:
      return "bg-secondary/60 text-foreground border-border/50";
  }
};

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function OrderStatusBadge({ status, className = "" }: OrderStatusBadgeProps) {
  const badgeStyle = getOrderStatusBadgeStyle(status);
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeStyle} ${className}`}
    >
      {status}
    </span>
  );
}
