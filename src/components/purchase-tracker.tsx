"use client";

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/analytics";

export interface PurchaseTrackerProps {
  order: {
    id: string;
    totalAmount: number; // in paise
    taxAmount?: number | null; // in paise
    shippingAmount: number; // in paise
    couponCode?: string | null;
    items: Array<{
      id: string;
      name: string;
      price: number; // in paise
      quantity: number;
      variantName?: string | null;
    }>;
  };
}

export function PurchaseTracker({ order }: PurchaseTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || trackedRef.current) return;

    // Prevent double-tracking on page refresh
    const storageKey = `ga_tracked_purchase_${order.id}`;
    if (sessionStorage.getItem(storageKey)) {
      return;
    }
    sessionStorage.setItem(storageKey, "true");
    trackedRef.current = true;

    // Convert values from paise to standard currency units (Rupees/Dollars)
    const totalAmount = order.totalAmount / 100;
    const taxAmount = (order.taxAmount || 0) / 100;
    const shippingAmount = order.shippingAmount / 100;

    const gaItems = order.items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price / 100,
      quantity: item.quantity,
      item_variant: item.variantName || undefined,
    }));

    trackPurchase(
      order.id,
      totalAmount,
      gaItems,
      taxAmount,
      shippingAmount,
      order.couponCode || undefined
    );
  }, [order]);

  return null;
}
