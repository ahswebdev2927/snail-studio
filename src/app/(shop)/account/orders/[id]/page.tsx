import React from "react";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { 
  ArrowLeft, 
  ShoppingBag, 
  MapPin, 
  Truck, 
  CreditCard, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  Activity,
  Package,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { db } from "@/db";
import { orders, systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";
import CustomerOrderActions from "@/components/orders/customer-order-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Order Details | Snail Studio",
  description: "Track shipment and view order summary detail pages at Snail Studio.",
};

export default async function OrderDetailsPage({ params }: PageProps) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect(`/login?callbackUrl=/account/orders/${id}`);
  }

  const user = await getSessionUser(token);

  if (!user) {
    redirect(`/login?callbackUrl=/account/orders/${id}`);
  }

  // Fetch the order with items, variant, product, address, shipments, and statusHistory relations
  const orderRecord = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: {
        with: {
          variant: {
            with: {
              product: {
                with: {
                  media: {
                    with: {
                      media: true,
                    },
                    orderBy: (pm, { asc }) => [asc(pm.sortOrder)],
                  },
                },
              },
            },
          },
        },
      },
      addresses: true,
      statusHistory: {
        orderBy: (sh, { desc }) => [desc(sh.createdAt)],
      },
      shipments: {
        with: {
          events: {
            orderBy: (e, { desc }) => [desc(e.timestamp)],
          },
        },
      },
    },
  });

  // Fetch settings from database
  const settingsRows = await db.select().from(systemSettings);
  const settingsObj = settingsRows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
  const storePhone = settingsObj.store_phone || "+91 99999 99999";

  // 1. Order Not Found Check
  if (!orderRecord) {
    return (
      <div className="py-16 text-center space-y-5">
        <div className="inline-flex p-4.5 bg-destructive/10 text-destructive rounded-full">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-1.5 max-w-xs mx-auto">
          <h3 className="font-serif text-base font-semibold text-foreground">Order Not Found</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            The requested order ID "{id}" could not be located in our system.
          </p>
        </div>
        <Link 
          href="/account/orders"
          className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors cursor-pointer"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  // 2. CRITICAL SECURITY GATE: Verify the user owns this order
  if (orderRecord.userId !== user.id) {
    return (
      <div className="py-16 text-center space-y-5">
        <div className="inline-flex p-4.5 bg-destructive/10 text-destructive rounded-full">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-1.5 max-w-xs mx-auto">
          <h3 className="font-serif text-base font-semibold text-foreground">Access Denied</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            You do not have permission to view this order details.
          </p>
        </div>
        <Link 
          href="/account/orders"
          className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors cursor-pointer"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const shippingAddress = orderRecord.addresses.find((addr) => addr.type === "shipping");
  const billingAddress = orderRecord.addresses.find((addr) => addr.type === "billing") || shippingAddress;
  const shipment = orderRecord.shipments?.[0];

  // Calculate Subtotal (price stored in paise)
  const subtotal = orderRecord.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Status mapping logic
  const currentStatus = orderRecord.status.toLowerCase();
  const isCancelled = currentStatus === "cancelled";
  const isRefunded = currentStatus === "refunded";
  const isPaid = currentStatus !== "pending" && !isCancelled;

  // Determine horizontal timeline step highlighting
  const timelineSteps = [
    { label: "Placed", active: true },
    { label: "Paid", active: isPaid },
    { label: "Processing", active: ["processing", "shipped", "delivered"].includes(currentStatus) },
    { label: "Shipped", active: ["shipped", "delivered"].includes(currentStatus) },
    { label: "Delivered", active: currentStatus === "delivered" }
  ];

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-success/15 text-success border border-success/30";
      case "processing":
      case "paid":
      case "pending":
        return "bg-warning/15 text-warning border border-warning/30";
      case "cancelled":
      case "refunded":
        return "bg-rose-500/10 text-rose-700 border border-rose-500/20 dark:text-rose-400";
      default:
        return "bg-secondary text-muted-foreground border border-border/40";
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Page Breadcrumb / Header */}
      <div className="space-y-4 pb-4 border-b border-border/20">
        <Link 
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-accent transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-xl md:text-2xl font-semibold text-foreground tracking-wide">
                Order Details
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeStyle(orderRecord.status)}`}>
                {orderRecord.status}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              ID: {orderRecord.id}
            </p>
          </div>
          
          <div className="text-right text-xs">
            <p className="text-[10px] text-muted-foreground font-bold uppercase pl-0.5">Placed On</p>
            <p className="font-medium text-foreground">
              {new Date(orderRecord.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Horizontal Order Progress timeline */}
      {!isCancelled && !isRefunded && (
        <div className="bg-card border border-border/30 rounded-2xl p-6 shadow-sm max-w-2xl mx-auto">
          <div className="grid grid-cols-5 text-center text-xs relative">
            {/* Connecting Line */}
            <div className="absolute top-4.5 left-[10%] right-[10%] h-[2px] bg-border/30 z-0" />
            
            {timelineSteps.map((step, index) => (
              <div key={index} className="flex flex-col items-center relative z-10">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center border text-[11px] font-bold transition-all ${
                    step.active 
                      ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/10" 
                      : "bg-background border-border/50 text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider mt-3 ${
                  step.active ? "text-primary" : "text-muted-foreground/60"
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4.5 rounded-2xl flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold uppercase tracking-wider text-[10px]">Order Cancelled</p>
            <p className="font-light">This order has been cancelled and will not be processed further. If you were charged, a refund is being initiated.</p>
          </div>
        </div>
      )}

      {isRefunded && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4.5 rounded-2xl flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold uppercase tracking-wider text-[10px]">Order Refunded</p>
            <p className="font-light">A full refund has been successfully credited back to your original source of payment.</p>
          </div>
        </div>
      )}

      {/* 4. Details Grid System */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items and Billing Breakdown (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Purchased Items Card */}
          <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
            <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border/20">
              <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
              Items Summary
            </h3>
            
            <div className="divide-y divide-border/20">
              {orderRecord.items.map((item) => {
                let imageUrl = "/luxury_nails_hero.png";
                const variantMedia = item.variant?.product?.media;
                if (variantMedia && variantMedia.length > 0 && variantMedia[0]?.media?.url) {
                  imageUrl = variantMedia[0].media.url;
                }

                return (
                  <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0 items-center justify-between">
                    <div className="flex gap-3.5 items-center min-w-0">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border/20 bg-secondary/10">
                        <Image 
                          src={imageUrl} 
                          alt={item.variant?.product?.name || "Nail Set"} 
                          fill 
                          className="object-cover" 
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-serif text-xs font-semibold text-foreground truncate">
                          {item.variant?.product?.name || "Luxury Nail Set"}
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-light mt-0.5 truncate">
                          SKU: {item.variant?.sku || "Default"}
                        </p>
                        <p className="text-[10px] text-primary font-medium mt-0.5 truncate">
                          Option: {item.variant?.name || "Default Style"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-foreground">
                        {formatPrice((item.price - item.discount) * item.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Summary breakdown */}
          <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
            <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border/20">
              <CreditCard className="w-4 h-4 text-primary shrink-0" />
              Bill Summary
            </h3>

            <div className="space-y-2.5 text-xs font-light">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
              
              {orderRecord.discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Coupon Discount {orderRecord.couponCode ? `(${orderRecord.couponCode})` : ""}</span>
                  <span>- {formatPrice(orderRecord.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping Fee</span>
                <span className="text-foreground">
                  {orderRecord.shippingAmount === 0 ? "FREE" : formatPrice(orderRecord.shippingAmount)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Tax (GST)</span>
                <span className="text-foreground">{formatPrice(orderRecord.taxAmount)}</span>
              </div>

              <div className="pt-2.5 border-t border-border/20 flex justify-between items-center text-sm font-bold">
                <span className="text-foreground font-serif">Grand Total</span>
                <span className="text-primary">{formatPrice(orderRecord.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Address, Shipment log, status log (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer Order Address & Editing Actions */}
          <CustomerOrderActions
            orderId={orderRecord.id}
            shippingAddress={shippingAddress ? {
              id: shippingAddress.id,
              name: shippingAddress.name,
              phone: shippingAddress.phone,
              addressLine1: shippingAddress.addressLine1,
              addressLine2: shippingAddress.addressLine2,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postalCode: shippingAddress.postalCode,
              country: shippingAddress.country
            } : null}
            shippingAmountPaid={orderRecord.shippingChargePaid > 0 ? orderRecord.shippingChargePaid : orderRecord.shippingAmount}
            currentShippingCharge={orderRecord.currentShippingCharge || orderRecord.shippingAmount}
            shippingDifference={orderRecord.shippingDifference}
            shippingDifferenceStatus={orderRecord.shippingDifferenceStatus}
            orderStatus={orderRecord.status}
            hasActiveShipment={orderRecord.shipments.some(s => s.status !== "cancelled")}
            storePhone={storePhone}
          />

          {/* Shipment & Tracker Card */}
          <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-3.5">
            <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/20">
              <Truck className="w-4 h-4 text-primary shrink-0" />
              Shipment Details
            </h3>

            {shipment ? (
              <div className="space-y-4">
                <div className="text-xs font-light space-y-1 bg-secondary/25 border border-border/20 rounded-xl p-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carrier:</span>
                    <span className="font-semibold text-foreground">{shipment.carrier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking #:</span>
                    <span className="font-mono font-semibold text-primary">{shipment.trackingNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium text-foreground uppercase text-[10px]">{shipment.status}</span>
                  </div>
                </div>

                {/* Vertical Tracking Events timeline */}
                {shipment.events && shipment.events.length > 0 && (
                  <div className="space-y-3 pl-2 border-l border-border/40 ml-1">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Tracking Log</span>
                    <div className="space-y-3">
                      {shipment.events.map((event) => (
                        <div key={event.id} className="relative pl-3 text-[10px] leading-relaxed">
                          {/* Circle Dot */}
                          <div className="absolute -left-[12.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                          <p className="text-muted-foreground/60 font-mono text-[8px]">
                            {new Date(event.timestamp).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                          <p className="font-semibold text-foreground">{event.status}</p>
                          {event.description && <p className="text-muted-foreground font-light">{event.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-muted-foreground font-light flex items-center gap-2 justify-center">
                <Package className="w-4 h-4 text-muted-foreground/60" />
                <span>Pending shipment details...</span>
              </div>
            )}
          </div>

          {/* Activity / Status History Log */}
          <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
            <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/20">
              <Activity className="w-4 h-4 text-primary shrink-0" />
              Order Updates
            </h3>

            {orderRecord.statusHistory && orderRecord.statusHistory.length > 0 ? (
              <div className="space-y-4 pl-2 border-l border-border/30 ml-1">
                {orderRecord.statusHistory.map((history) => (
                  <div key={history.id} className="relative pl-3.5 text-xs">
                    {/* Event Dot */}
                    <div className="absolute -left-[12.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-accent border border-background" />
                    
                    <p className="font-semibold text-foreground capitalize flex items-center gap-1.5">
                      {history.status}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono">
                      {new Date(history.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    {history.notes && (
                      <p className="text-[10px] text-muted-foreground font-light leading-relaxed mt-0.5 bg-secondary/15 rounded-lg p-2 border border-border/10">
                        {history.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-light">No updates recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
