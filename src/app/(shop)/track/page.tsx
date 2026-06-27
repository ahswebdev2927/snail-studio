"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  
  // Form values
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);

  // Auto-run if search parameters are present in the URL
  useEffect(() => {
    const trk = searchParams.get("trackingNumber");
    const ord = searchParams.get("orderId");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");

    if (trk) {
      setTrackingNumberInput(trk);
      setActiveTab("tracking");
      fetchTrackingData({ trackingNumber: trk });
    } else if (ord) {
      setOrderIdInput(ord);
      setEmailInput(email || "");
      setPhoneInput(phone || "");
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
    setErrorMsg("");
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
        setErrorMsg(data.error || "Failed to retrieve tracking details.");
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected connection error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumberInput.trim()) {
      setErrorMsg("Please enter a valid tracking number.");
      return;
    }
    router.replace(`/track?trackingNumber=${encodeURIComponent(trackingNumberInput.trim())}`);
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderIdInput.trim()) {
      setErrorMsg("Please enter a valid order number.");
      return;
    }
    const query = new URLSearchParams();
    query.set("orderId", orderIdInput.trim());
    if (emailInput.trim()) query.set("email", emailInput.trim());
    if (phoneInput.trim()) query.set("phone", phoneInput.trim());
    
    router.replace(`/track?${query.toString()}`);
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
              setErrorMsg("");
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
              setErrorMsg("");
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
          <form onSubmit={handleTrackingSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="trackingNumber" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Courier Tracking / Waybill Number
              </label>
              <div className="relative">
                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/80" />
                <input
                  id="trackingNumber"
                  type="text"
                  placeholder="e.g. TRK9876543210"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-secondary/20 border border-border/50 focus:border-primary focus:outline-none rounded-xl text-sm font-light text-foreground transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-primary/10"
            >
              {isLoading ? "Retrieving Details..." : "Track Package"}
              {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>
        )}

        {/* Tab 2: Order Number + Email/Phone Form */}
        {activeTab === "order" && (
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="orderId" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Order Number
                </label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/80" />
                  <input
                    id="orderId"
                    type="text"
                    placeholder="e.g. ord_B1Kx9P2z"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-secondary/20 border border-border/50 focus:border-primary focus:outline-none rounded-xl text-sm font-light text-foreground transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address (Verification)
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="shopper@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/20 border border-border/50 focus:border-primary focus:outline-none rounded-xl text-sm font-light text-foreground transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Phone Number (Verification)
                </label>
                <input
                  id="phone"
                  type="text"
                  placeholder="+91 XXXXX XXXXX"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-4 py-3 bg-secondary/20 border border-border/50 focus:border-primary focus:outline-none rounded-xl text-sm font-light text-foreground transition-all"
                />
              </div>
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
          </form>
        )}

        {/* Error message panel */}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center gap-3 text-xs leading-relaxed">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
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
            
            {/* Header info */}
            <div className="bg-card border border-border/30 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Order Timeline</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      result.order.status === "delivered" 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}>
                      {result.order.status}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg font-normal text-foreground">
                    Order ID: <span className="font-sans font-bold">{result.order.id}</span>
                  </h3>
                </div>
                <div className="text-right text-xs">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Estimated Delivery</p>
                  <p className="font-serif text-sm font-semibold text-primary">
                    {result.order.shipments?.[0]?.estimatedDeliveryAt 
                      ? new Date(result.order.shipments[0].estimatedDeliveryAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                      : "Pending Dispatch"}
                  </p>
                </div>
              </div>

              {/* Visual Horizontal Timeline */}
              {(() => {
                const { steps, shipmentSteps, isCancelled, isRefunded } = getOrderStatusTimeline(result.order);
                
                if (isCancelled) {
                  return (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center gap-3 text-xs">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[9px]">Cancelled</p>
                        <p className="font-light">This order has been cancelled and will not be processed further.</p>
                      </div>
                    </div>
                  );
                }

                if (isRefunded) {
                  return (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center gap-3 text-xs">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[9px]">Refunded</p>
                        <p className="font-light">A refund has been issued back to the source payment method.</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6 pt-2">
                    {/* Order progress */}
                    <div className="space-y-4">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Order Workflow</span>
                      <div className="grid grid-cols-5 text-center text-xs relative">
                        <div className="absolute top-4 left-[10%] right-[10%] h-[1.5px] bg-border/40 z-0" />
                        {steps.map((step, idx) => (
                          <div key={idx} className="flex flex-col items-center relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                              step.done 
                                ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/10"
                                : "bg-card border-border/50 text-muted-foreground"
                            }`}>
                              <step.icon className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider mt-2.5 block ${
                              step.done ? "text-primary" : "text-muted-foreground/60"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipment progress timeline */}
                    <div className="pt-4 border-t border-border/15 space-y-4">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Shipment Progress</span>
                      <div className="grid grid-cols-4 text-center text-xs relative">
                        <div className="absolute top-4 left-[12.5%] right-[12.5%] h-[1.5px] bg-border/40 z-0" />
                        {shipmentSteps.map((step, idx) => (
                          <div key={idx} className="flex flex-col items-center relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                              step.done 
                                ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/10"
                                : "bg-card border-border/50 text-muted-foreground"
                            }`}>
                              {step.done ? "✓" : idx + 1}
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-wider mt-2.5 block ${
                              step.done ? "text-primary" : "text-muted-foreground/60"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Carrier info & Detailed events */}
            {result.order.shipments && result.order.shipments.length > 0 ? (
              result.order.shipments.map((ship) => (
                <div key={ship.id} className="bg-card border border-border/30 rounded-3xl p-6 shadow-sm space-y-6">
                  {/* Courier details header */}
                  <div className="flex items-center justify-between p-4 bg-secondary/15 rounded-2xl border border-border/20 text-xs">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Courier Partner</p>
                      <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        {ship.carrier}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Waybill / Tracking #</p>
                      <p className="font-mono font-semibold text-primary text-sm tracking-wider">{ship.trackingNumber}</p>
                    </div>
                  </div>

                  {/* Vertical Events Timeline */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shipment History & Updates</h4>
                    
                    {ship.events && ship.events.length > 0 ? (
                      <div className="space-y-5 pl-4 border-l border-border/40 ml-2">
                        {ship.events.map((event) => (
                          <div key={event.id} className="relative space-y-1">
                            {/* Dot indicator */}
                            <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary border border-card" />
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold uppercase text-foreground bg-secondary/50 px-2 py-0.5 border border-border/40 rounded-[6px] text-[9px] tracking-wide">
                                {event.status.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-light">{formatDate(event.timestamp)}</span>
                              {event.location && (
                                <span className="text-[9px] text-muted-foreground/80 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-primary/80" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-xs font-light text-muted-foreground italic leading-relaxed pl-0.5">{event.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground font-light italic pl-1">Shipment created, waiting for pickup dispatch events...</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-card border border-border/30 rounded-3xl p-6 text-center space-y-3 shadow-sm">
                <div className="p-3 bg-secondary/30 text-muted-foreground rounded-full inline-block">
                  <Package className="w-6 h-6" />
                </div>
                <div className="max-w-xs mx-auto space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Awaiting Shipment Dispatch</p>
                  <p className="text-muted-foreground font-light">Your order is being handcrafted. As soon as the courier partner receives the package, the waybill status will update here.</p>
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
                  <div className="flex justify-between text-emerald-500">
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
