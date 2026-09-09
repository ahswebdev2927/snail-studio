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
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSystemSettingsMap } from "@/services/settings";
import { getSessionUser } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";
import CustomerOrderActions from "@/components/orders/customer-order-actions";
import CustomerItemReturnAction from "@/components/orders/customer-item-return-action";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { CustomerTrackingTimeline } from "@/components/orders/customer-tracking-timeline";
import { 
  ShipmentUpdatesAccordion, 
  OrderUpdatesAccordion 
} from "@/components/orders/order-details-accordions";


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

  // Fetch the order with items, variant, product, address, shipments, returnRequests, and statusHistory relations
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
      returnRequests: true,
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

  // Fetch settings from database (cached)
  const settingsObj = await getSystemSettingsMap();
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
          className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/95 transition-all cursor-pointer"
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
          className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/95 transition-all cursor-pointer"
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
              <OrderStatusBadge status={orderRecord.status} />
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

      {/* 3. Horizontal Order & Shipping Progress Timeline */}
      <CustomerTrackingTimeline
        orderStatus={orderRecord.status}
        shipmentStatus={shipment?.status}
      />


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
                    
                    <div className="text-right shrink-0 space-y-1.5">
                      <span className="text-xs font-semibold text-foreground block">
                        {formatPrice((item.price - item.discount) * item.quantity)}
                      </span>
                      <CustomerItemReturnAction
                        orderId={orderRecord.id}
                        orderStatus={orderRecord.status}
                        orderItem={item}
                        returnRequests={orderRecord.returnRequests || []}
                        orderDeliveredAt={shipment?.updatedAt || orderRecord.updatedAt}
                      />
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
            shippingAmountPaid={
              orderRecord.shippingCalculatedAt !== null
                ? orderRecord.currentShippingCharge - orderRecord.shippingDifference
                : orderRecord.shippingChargePaid > 0
                ? orderRecord.shippingChargePaid
                : orderRecord.shippingAmount
            }
            currentShippingCharge={orderRecord.currentShippingCharge || orderRecord.shippingAmount}
            shippingDifference={orderRecord.shippingDifference}
            shippingDifferenceStatus={orderRecord.shippingDifferenceStatus}
            orderStatus={orderRecord.status}
            hasActiveShipment={orderRecord.shipments.some(s => s.status !== "cancelled")}
            storePhone={storePhone}
          />

          {/* Shipment Updates Accordion */}
          <ShipmentUpdatesAccordion
            shipment={shipment ? {
              carrier: shipment.carrier,
              provider: shipment.provider,
              trackingNumber: shipment.trackingNumber || shipment.waybill || "",
              trackingUrl: shipment.trackingUrl,
              estimatedDeliveryAt: shipment.estimatedDeliveryAt,
              events: shipment.events || [],
            } : null}
          />

          {/* Order Updates Accordion */}
          <OrderUpdatesAccordion
            statusHistory={orderRecord.statusHistory || []}
          />
        </div>
      </div>
    </div>
  );
}
