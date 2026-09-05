"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Search, 
  Truck, 
  MapPin, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ClipboardList, 
  Calendar,
  ArrowRight,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronDown,
  Info
} from "lucide-react";
import CloudinaryImage from "@/components/media/cloudinary-image";
import { Form } from "@/components/forms/form";
import { FormField } from "@/components/forms/form-field";
import { InputField, PhoneInputField } from "@/components/forms/fields";
import { notify } from "@/lib/toast";
import { 
  trackingLookupSchema, 
  orderLookupSchema, 
  type TrackingLookupInput, 
  type OrderLookupInput 
} from "@/lib/validators/auth";
import { CustomerTrackingTimeline } from "@/components/orders/customer-tracking-timeline";
import { CustomerTrackingEvents } from "@/components/orders/customer-tracking-events";


interface TrackingResult {
  success: boolean;
  order: {
    id: string;
    status: string;
    totalAmount: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    couponCode: string | null;
    createdAt: string;
    items: {
      id: string;
      quantity: number;
      price: number;
      variant: {
        id: string;
        sku: string;
        name: string;
        product: {
          name: string;
          media: {
            media: {
              url: string;
            };
          }[];
        } | null;
      } | null;
    }[];
    addresses: {
      id: string;
      type: "billing" | "shipping";
      name: string;
      phone: string;
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }[];
    statusHistory: {
      id: string;
      status: string;
      notes: string | null;
      createdAt: string;
    }[];
    shipments: {
      id: string;
      carrier: string;
      trackingNumber: string;
      trackingUrl?: string | null;
      status: string;
      shippedAt: string | null;
      estimatedDeliveryAt: string | null;
      events: {
        id: string;
        status: string;
        location: string | null;
        description: string | null;
        timestamp: string;
      }[];
    }[];
  };
}

function TrackingSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"tracking" | "order">("tracking");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);

  // 1. Tracking Number Form
  const trackingForm = useForm<TrackingLookupInput>({
    resolver: zodResolver(trackingLookupSchema),
    defaultValues: {
      trackingNumber: "",
    },
    mode: "onBlur",
  });

  // 2. Order Number Form
  const orderForm = useForm<OrderLookupInput>({
    resolver: zodResolver(orderLookupSchema),
    defaultValues: {
      orderId: "",
      email: "",
      phone: "",
    },
    mode: "onBlur",
  });

  // Auto-run if search parameters are present in the URL
  useEffect(() => {
    const trk = searchParams.get("trackingNumber");
    const ord = searchParams.get("orderId");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    if (trk) {
      trackingForm.setValue("trackingNumber", trk);
      setActiveTab("tracking");
      fetchTrackingData({ trackingNumber: trk });
    } else if (ord) {
      orderForm.setValue("orderId", ord);
      orderForm.setValue("email", email || "");
      orderForm.setValue("phone", phone || "");
      setActiveTab("order");
      fetchTrackingData({ orderId: ord, email: email || "", phone: phone || "" });
    }
  }, [searchParams]);

  const fetchTrackingData = async (params: {
    trackingNumber?: string;
    orderId?: string;
    email?: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    setResult(null);

    try {
      const query = new URLSearchParams();
      if (params.trackingNumber) query.set("trackingNumber", params.trackingNumber);
      if (params.orderId) query.set("orderId", params.orderId);
      if (params.email) query.set("email", params.email);
      if (params.phone) query.set("phone", params.phone);

      const res = await fetch(`/api/track?${query.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        notify.error(data.error || "Failed to retrieve tracking details.");
      } else {
        setResult(data);
        notify.success("Tracking information loaded.");
      }
    } catch (err) {
      console.error(err);
      notify.error("An unexpected connection error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackingSubmit = (data: any) => {
    router.replace(`/track?trackingNumber=${encodeURIComponent(data.trackingNumber.trim())}`);
  };

  const handleOrderSubmit = (data: any) => {
    const query = new URLSearchParams();
    query.set("orderId", data.orderId.trim());
    if (data.email?.trim()) query.set("email", data.email.trim());
    if (data.phone?.trim()) query.set("phone", data.phone.trim());
    
    router.replace(`/track?${query.toString()}`);
  };

  // Format phone inputs dynamically to match +91 prefix requirements
  const formatPhoneNumber = (val: string) => {
    let digits = val.replace(/\s+/g, "");
    if (!digits) return "";
    if (!digits.startsWith("+91")) {
      const raw = digits.replace(/[^\d]/g, "");
      if (raw.startsWith("91") && raw.length > 2) {
        digits = "+" + raw;
      } else {
        digits = "+91" + raw;
      }
    }
    return digits.slice(0, 13);
  };

  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getOrderStatusTimeline = (order: any) => {
    const status = order.status.toLowerCase();
    const isCancelled = status === "cancelled";
    const isRefunded = status === "refunded";
    
    const shipment = order.shipments?.[0];
    const shipmentStatus = shipment?.status?.toLowerCase() || "";

    const hasShipment = !!shipment;
    
    // Core stages: Placed -> Confirmed -> Processing -> Ready to Ship -> Shipped -> Delivered
    const orderHistory = order.statusHistory || [];
    const hasReadyToShip = orderHistory.some((h: any) => h.status === "ready_to_ship") || hasShipment;
    const hasShipped = ["shipped", "delivered"].includes(status) || ["pickup_completed", "in_transit", "reached_destination_hub", "out_for_delivery", "delivered"].includes(shipmentStatus);
    const hasDelivered = status === "delivered" || shipmentStatus === "delivered";

    const steps = [
      { 
        label: "Order Placed", 
        done: true, 
        icon: Package,
        desc: "We received your order." 
      },
      { 
        label: "Confirmed", 
        done: status !== "pending" && !isCancelled, 
        icon: ShieldCheck,
        desc: "Order accepted & payment verified."
      },
      { 
        label: "Processing", 
        done: ["processing", "shipped", "delivered"].includes(status) || hasReadyToShip, 
        icon: Clock,
        desc: "Nails are being handcrafted and inspected."
      },
      { 
        label: "Ready To Ship", 
        done: hasReadyToShip, 
        icon: ClipboardList,
        desc: "Invoice printed and package waybill generated."
      },
      { 
        label: "Shipped", 
        done: hasShipped, 
        icon: Truck,
        desc: "Shipment has departed Snail Studio warehouse."
      }
    ];

    // Shipment Sub-timeline (only show if shipped or has shipment progress)
    const shipmentSteps = [];
    if (hasShipment) {
      const isPickup = ["pickup_completed", "in_transit", "reached_destination_hub", "out_for_delivery", "delivered"].includes(shipmentStatus);
      const isTransit = ["in_transit", "reached_destination_hub", "out_for_delivery", "delivered"].includes(shipmentStatus);
      const isOutForDelivery = ["out_for_delivery", "delivered"].includes(shipmentStatus);
      const isDelivered = shipmentStatus === "delivered";

      shipmentSteps.push(
        { label: "Pickup Completed", done: isPickup, desc: "Courier has picked up package." },
        { label: "In Transit", done: isTransit, desc: "Package is on its way to destination." },
        { label: "Out For Delivery", done: isOutForDelivery, desc: "Courier partner is delivering today." },
        { label: "Delivered", done: isDelivered, desc: "Package successfully received." }
      );
    } else {
      // Revert to order delivered milestone
      shipmentSteps.push(
        { label: "Delivered", done: hasDelivered, desc: "Package successfully received." }
      );
    }

    return { steps, shipmentSteps, isCancelled, isRefunded };
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans max-w-5xl mx-auto space-y-12">
      {/* Header Panel */}
      <div className="text-center space-y-3">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground font-normal tracking-wide">
          Track Your Order
        </h1>
        <p className="text-sm text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
          Inspect order status, view shipment events, and check real-time courier updates.
        </p>
      </div>

      {/* Lookup Card Form */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 md:p-8 shadow-xl max-w-2xl mx-auto space-y-6">
        {/* Tab Buttons */}
        <div className="flex gap-2 p-1 bg-secondary/30 rounded-xl border border-border/30">
          <button
            onClick={() => {
              setActiveTab("tracking");
            }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "tracking"
                ? "bg-card text-foreground shadow-sm border border-border/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tracking Number
          </button>
          <button
            onClick={() => {
              setActiveTab("order");
            }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "order"
                ? "bg-card text-foreground shadow-sm border border-border/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Order Details
          </button>
        </div>

        {/* Tab 1: Tracking Number Form */}
        {activeTab === "tracking" && (
          <Form methods={trackingForm} onSubmit={handleTrackingSubmit} className="space-y-4">
            <FormField name="trackingNumber" label="Courier Tracking / Waybill Number" required>
              <InputField
                leftIcon={<Truck className="w-4.5 h-4.5 text-muted-foreground/80" />}
                placeholder="e.g. TRK9876543210"
              />
            </FormField>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-primary/10"
            >
              {isLoading ? "Retrieving Details..." : "Track Package"}
              {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </Form>
        )}

        {/* Tab 2: Order Number + Email/Phone Form */}
        {activeTab === "order" && (
          <Form methods={orderForm} onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FormField name="orderId" label="Order Number" required>
                  <InputField
                    leftIcon={<Package className="w-4.5 h-4.5 text-muted-foreground/80" />}
                    placeholder="e.g. ord_B1Kx9P2z"
                  />
                </FormField>
              </div>

              <FormField name="email" label="Email Address (Verification)">
                <InputField type="email" placeholder="shopper@email.com" />
              </FormField>

              <FormField name="phone" label="Phone Number (Verification)">
                <PhoneInputField />
              </FormField>
            </div>
            
            <p className="text-[10px] text-muted-foreground/80 font-light flex gap-1.5 items-center pl-1">
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
              For security, verification by either matching email or phone number is recommended.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-primary/10"
            >
              {isLoading ? "Retrieving Details..." : "Track Order"}
              {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </Form>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground animate-pulse">
          <Truck className="w-8 h-8 animate-bounce text-primary" />
          <p className="text-xs font-light">Retrieving shipping parameters...</p>
        </div>
      )}

      {/* Results details panel */}
      {result && result.order && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: TIMELINE & CARRIER TRACK (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Visual Tracking Progress Bar */}
            <CustomerTrackingTimeline
              orderStatus={result.order.status}
              shipmentStatus={result.order.shipments?.[0]?.status}
            />

            {/* Carrier Info & Detailed Events */}
            {result.order.shipments && result.order.shipments.length > 0 ? (
              result.order.shipments.map((ship: any) => (
                <CustomerTrackingEvents
                  key={ship.id}
                  carrier={ship.carrier}
                  provider={ship.provider || "delhivery"}
                  trackingNumber={ship.trackingNumber || ship.waybill || ""}

                  trackingUrl={ship.trackingUrl}
                  estimatedDeliveryAt={ship.estimatedDeliveryAt}
                  events={ship.events || []}
                />
              ))
            ) : (
              <div className="bg-card border border-border/30 rounded-3xl p-6 text-center space-y-3 shadow-sm">
                <div className="p-3 bg-secondary/30 text-muted-foreground rounded-full inline-block">
                  <Package className="w-6 h-6 animate-pulse text-primary" />
                </div>
                <div className="max-w-xs mx-auto space-y-1 text-xs font-light">
                  <p className="font-semibold text-foreground font-serif text-sm">Awaiting Shipment Dispatch</p>
                  <p className="text-muted-foreground">Your order is being handcrafted with care. As soon as the courier partner receives the package, the waybill status will update here.</p>
                </div>
              </div>
            )}
          </div>


          {/* RIGHT: DESTINATION, ITEMS & SUMMARY (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Delivery address */}
            <div className="bg-card border border-border/30 rounded-3xl p-6 shadow-sm space-y-3.5">
              <h4 className="font-serif text-sm font-semibold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/20">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                Delivery Address
              </h4>
              {(() => {
                const shipping = result.order.addresses.find(a => a.type === "shipping");
                if (!shipping) return <p className="text-xs text-muted-foreground italic">No address details available.</p>;
                return (
                  <div className="text-xs font-light leading-relaxed space-y-1">
                    <p className="font-semibold text-foreground">{shipping.name}</p>
                    <p className="text-muted-foreground">{shipping.addressLine1}</p>
                    {shipping.addressLine2 && <p className="text-muted-foreground">{shipping.addressLine2}</p>}
                    <p className="text-muted-foreground">{shipping.city}, {shipping.state} - {shipping.postalCode}</p>
                    <p className="text-muted-foreground">{shipping.country}</p>
                    <p className="text-[10px] text-muted-foreground font-medium pt-1">Contact: {shipping.phone}</p>
                  </div>
                );
              })()}
            </div>

            {/* Line items purchased */}
            <div className="bg-card border border-border/30 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="font-serif text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border/20">
                <ClipboardList className="w-4 h-4 text-primary shrink-0" />
                Purchased Items
              </h4>

              <div className="divide-y divide-border/20">
                {result.order.items.map((item) => {
                  let imgUrl = "/luxury_nails_hero.png";
                  const media = item.variant?.product?.media;
                  if (media && media.length > 0 && media[0]?.media?.url) {
                    imgUrl = media[0].media.url;
                  }

                  return (
                    <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0 items-center justify-between">
                      <div className="flex gap-3 items-center min-w-0">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border/20 bg-secondary/15">
                          <CloudinaryImage 
                            src={imgUrl} 
                            variant="thumbnail"
                            alt={item.variant?.product?.name || "Nails"} 
                            fill
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="min-w-0 text-xs">
                          <h5 className="font-serif font-semibold text-foreground truncate">
                            {item.variant?.product?.name || "Handcrafted Nails"}
                          </h5>
                          <p className="text-[9px] text-primary/80 font-medium truncate mt-0.5">
                            Option: {item.variant?.name || "Default Style"}
                          </p>
                          <p className="text-[9px] text-muted-foreground/80 mt-0.5">
                            Qty: {item.quantity} × {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 text-xs font-semibold text-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Financial summary breakdown */}
              <div className="pt-3 border-t border-border/20 space-y-1.5 text-xs font-light">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Fee</span>
                  <span className="text-foreground">
                    {result.order.shippingAmount === 0 ? "FREE" : formatPrice(result.order.shippingAmount)}
                  </span>
                </div>
                {result.order.discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount {result.order.couponCode ? `(${result.order.couponCode})` : ""}</span>
                    <span>-{formatPrice(result.order.discountAmount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border/25 flex justify-between font-serif text-sm font-bold text-foreground">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatPrice(result.order.totalAmount)}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export default function PublicTrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-light animate-pulse">Loading tracking interface...</p>
        </div>
      </div>
    }>
      <TrackingSearchContent />
    </Suspense>
  );
}
