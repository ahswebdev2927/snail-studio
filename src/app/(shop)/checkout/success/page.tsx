import React from "react";
import Link from "next/link";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { 
  CheckCircle2, 
  ShoppingBag, 
  MapPin, 
  Truck, 
  CreditCard, 
  ArrowRight,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export const metadata = {
  title: "Order Confirmed | Snail Studio",
  description: "Thank you for your order! Your handcrafted press-on nails order is being processed.",
};

export default async function OrderSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderId = params.orderId;

  // Fetch the order with items, variant, product, and shipping address relations
  const orderRecord = orderId
    ? await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          items: {
            with: {
              variant: {
                with: {
                  product: true,
                },
              },
            },
          },
          addresses: true,
          statusHistory: true,
        },
      })
    : null;

  if (!orderRecord) {
    return (
      <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[60vh] px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="font-serif text-2xl font-normal text-foreground">Order Not Found</h2>
        <p className="text-xs text-muted-foreground font-light max-w-xs leading-relaxed">
          We couldn't retrieve the details for Order ID: "{orderId || 'unknown'}". If you paid successfully, please contact support.
        </p>
        <Link 
          href="/shop" 
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const shippingAddress = orderRecord.addresses.find((addr) => addr.type === "shipping");
  const billingAddress = orderRecord.addresses.find((addr) => addr.type === "billing") || shippingAddress;

  // Format order date
  const orderDate = new Date(orderRecord.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Keep values in paise as stored in the database
  const shippingCost = orderRecord.shippingAmount;
  const discountCost = orderRecord.discountAmount;
  const totalPaid = orderRecord.totalAmount;
  
  // Calculate subtotal in paise from DB prices
  const subtotal = orderRecord.items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  // Status mapping
  const currentStatus = orderRecord.status.toLowerCase();
  const isPaid = currentStatus !== "pending" && currentStatus !== "cancelled";

  return (
    <div className="min-h-screen bg-background text-foreground px-4 md:px-8 py-12 max-w-4xl mx-auto">
      
      {/* Thank you card */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 md:p-10 space-y-8 shadow-sm text-center">
        
        {/* Animated celebration icon */}
        <div className="space-y-3">
          <div className="inline-flex p-4.5 bg-success/15 rounded-full text-success relative">
            <CheckCircle2 className="w-10 h-10 animate-pulse" />
            <Sparkles className="w-5 h-5 text-accent absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest font-sans">
            Payment Confirmed
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-normal tracking-wide text-foreground">
            Thank you for your order!
          </h1>
          <p className="text-xs text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
            Your payment was completed successfully. We have sent an order confirmation email to you, and we're preparing your luxury handcrafted nails.
          </p>
        </div>

        {/* Order Status Timeline Progress */}
        <div className="max-w-xl mx-auto border-t border-b border-border/20 py-6 my-4">
          <div className="grid grid-cols-5 text-center text-xs relative">
            <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-border/40 z-0" />
            
            {[
              { label: "Placed", active: true },
              { label: "Paid", active: isPaid },
              { label: "Processing", active: currentStatus === "processing" || currentStatus === "shipped" || currentStatus === "delivered" },
              { label: "Shipped", active: currentStatus === "shipped" || currentStatus === "delivered" },
              { label: "Delivered", active: currentStatus === "delivered" }
            ].map((s, index) => (
              <div key={index} className="flex flex-col items-center relative z-10">
                <div 
                  className={`w-8.5 h-8.5 rounded-full flex items-center justify-center border text-[11px] font-bold transition-all ${
                    s.active 
                      ? "bg-primary border-primary text-primary-foreground shadow-sm" 
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider mt-2.5 ${s.active ? "text-primary" : "text-muted-foreground/60"}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Info Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left font-sans text-xs">
          
          <div className="space-y-2 p-4 bg-secondary/20 rounded-2xl border border-border/10">
            <div className="flex items-center gap-1.5 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Order Information
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Order ID</p>
              <p className="font-mono text-muted-foreground text-[11px] font-bold">{orderRecord.id}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Placed On</p>
              <p className="text-muted-foreground text-[11px]">{orderDate}</p>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-secondary/20 rounded-2xl border border-border/10">
            <div className="flex items-center gap-1.5 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Delivery Address
            </div>
            {shippingAddress ? (
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{shippingAddress.name}</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {shippingAddress.addressLine1}, {shippingAddress.addressLine2 ? `${shippingAddress.addressLine2}, ` : ""}{shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postalCode}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{shippingAddress.phone}</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic text-[11px]">No shipping address found</p>
            )}
          </div>

          <div className="space-y-2 p-4 bg-secondary/20 rounded-2xl border border-border/10">
            <div className="flex items-center gap-1.5 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
              <Clock className="w-3.5 h-3.5 text-primary" /> Logistics & Payment
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Delivery Speed</p>
              <p className="text-muted-foreground text-[11px]">
                {orderRecord.shippingAmount > 9900 ? "Express (2-3 days)" : "Standard (5-7 days)"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Payment Status</p>
              <p className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                {orderRecord.status.toUpperCase()}
              </p>
            </div>
          </div>

        </div>

        {/* Order items purchased */}
        <div className="space-y-4 text-left">
          <h3 className="font-serif text-base font-normal text-foreground border-b border-border/20 pb-2">
            Items Ordered
          </h3>
          <div className="space-y-3.5">
            {orderRecord.items.map((item) => {
              const productName = item.variant?.product?.name || "Premium Handcrafted Nails";
              const productMedia = item.variant?.product?.id; // can be used if we had media, otherwise default
              const variantName = item.variant?.name || "Default Style";
              const itemPrice = item.price;

              return (
                <div key={item.id} className="flex gap-4 text-xs font-sans items-center">
                  <div className="w-12 h-12 rounded-lg border border-border/30 bg-secondary/20 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm font-normal text-foreground truncate">{productName}</p>
                    <p className="text-[10px] text-muted-foreground font-light mt-0.5 truncate">{variantName}</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono">Quantity: {item.quantity}</p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-foreground shrink-0">
                    {formatPrice(itemPrice * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing calculations */}
        <div className="pt-6 border-t border-border/20 text-left font-sans text-xs max-w-sm ml-auto space-y-2.5">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{formatPrice(subtotal)}</span>
          </div>
          
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span className="font-mono">
              {shippingCost === 0 ? "FREE" : formatPrice(shippingCost)}
            </span>
          </div>

          {discountCost > 0 && (
            <div className="flex justify-between text-success">
              <span>Coupon Discount</span>
              <span className="font-mono">-{formatPrice(discountCost)}</span>
            </div>
          )}



          <div className="border-t border-border/30 my-2 pt-3 flex justify-between font-serif text-base font-normal text-foreground">
            <span>Total Paid</span>
            <span className="font-mono text-base font-bold text-primary">{formatPrice(totalPaid)}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="pt-6 border-t border-border/20 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Link 
            href="/shop" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link 
            href="/admin" // Redirect to user account or tracker if needed, for now back to portal
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/85 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold transition-all"
          >
            <span>Track Order Status</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
