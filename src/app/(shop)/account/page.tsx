import React from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ShoppingBag, 
  Heart, 
  MapPin, 
  ArrowRight, 
  Star, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { getDashboardData } from "@/features/account/actions";
import { formatPrice } from "@/lib/utils";
import { DashboardClient } from "./dashboard-client";

export default async function AccountPage() {
  const res = await getDashboardData();

  if (!res.success || !res.data) {
    return (
      <div className="p-6 text-center space-y-4">
        <h2 className="font-serif text-xl font-semibold text-destructive">Error Loading Dashboard</h2>
        <p className="text-sm text-muted-foreground font-light">
          {res.error || "We encountered an issue retrieving your account details."}
        </p>
      </div>
    );
  }

  const { totalOrders, defaultAddress, recentOrders, wishlistCount, wishlistProducts } = res.data;

  // Status Badge styling helper
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400";
      case "processing":
      case "paid":
      case "pending":
        return "bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400";
      case "cancelled":
      case "refunded":
        return "bg-rose-500/10 text-rose-750 border border-rose-500/20 dark:text-rose-455";
      default:
        return "bg-secondary text-muted-foreground border border-border/40";
    }
  };

  return (
    <div className="space-y-10">
      {/* 1. Welcoming Banner */}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground tracking-wide flex items-center gap-2">
          Dashboard
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground font-light">
          Here is a quick overview of your recent account activity.
        </p>
      </div>

      {/* 2. Stats Quick Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Orders Card */}
        <Link 
          href="/account/orders"
          className="bg-card border border-border/30 rounded-2xl p-5 hover:border-primary/30 transition-all group flex flex-col justify-between h-32"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">Total Orders</span>
            <div className="p-2 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-bold text-foreground">{totalOrders}</span>
            <span className="text-[10px] text-primary flex items-center gap-0.5 font-medium group-hover:translate-x-1 transition-transform">
              View History <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Wishlist Card */}
        <Link 
          href="/wishlist"
          className="bg-card border border-border/30 rounded-2xl p-5 hover:border-primary/30 transition-all group flex flex-col justify-between h-32"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">Wishlist Items</span>
            <div className="p-2 bg-accent/10 text-accent rounded-xl group-hover:scale-110 transition-transform">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-bold text-foreground">{wishlistCount}</span>
            <span className="text-[10px] text-accent flex items-center gap-0.5 font-medium group-hover:translate-x-1 transition-transform">
              Manage Items <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Default Shipping Card */}
        <Link 
          href="/account/addresses"
          className="bg-card border border-border/30 rounded-2xl p-5 hover:border-primary/30 transition-all group flex flex-col justify-between h-32"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">Default Address</span>
            <div className="p-2 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate block">
              {defaultAddress ? `${defaultAddress.city}, ${defaultAddress.state}` : "None Configured"}
            </span>
            <span className="text-[10px] text-primary flex items-center gap-0.5 font-medium group-hover:translate-x-1 transition-transform">
              Manage Addresses <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* Dev helper triggers (adds Test order button etc.) */}
      <DashboardClient initialOrdersCount={totalOrders} />

      {/* 3. Main Dashboard Double Column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Left Column: Recent Orders (8 cols) */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border/20">
            <h3 className="font-serif text-lg font-semibold text-foreground">Recent Orders</h3>
            {totalOrders > 3 && (
              <Link 
                href="/account/orders"
                className="text-[10px] uppercase font-bold tracking-widest text-primary hover:text-accent flex items-center gap-1"
              >
                All Orders <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-secondary/15 border border-border/20 rounded-3xl p-10 text-center space-y-4">
              <p className="text-xs text-muted-foreground font-light">
                You haven't placed any orders yet. Visit our shop collections to select your luxury nails!
              </p>
              <Link 
                href="/shop"
                className="inline-flex justify-center items-center px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/10 cursor-pointer"
              >
                Shop Collection
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {recentOrders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-card border border-border/30 rounded-2xl overflow-hidden hover:border-primary/20 transition-colors"
                >
                  {/* Order Card Header */}
                  <div className="bg-secondary/25 px-5 py-4 border-b border-border/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Order ID</p>
                        <p className="font-mono font-medium text-foreground">{order.id}</p>
                      </div>
                      <div className="h-6 w-[1px] bg-border/40" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Date</p>
                        <p className="font-medium text-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                      <div className="text-right">
                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Total Amount</p>
                        <p className="font-bold text-primary">{formatPrice(order.totalAmount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Card Items */}
                  <div className="p-5 divide-y divide-border/20">
                    {order.items.map((item) => {
                      // Retrieve primary image url safely
                      let itemImageUrl = "/luxury_nails_hero.png";
                      const variantMedia = item.variant?.product?.media;
                      if (variantMedia && variantMedia.length > 0 && variantMedia[0]?.media?.url) {
                        itemImageUrl = variantMedia[0].media.url;
                      }

                      return (
                        <div key={item.id} className="flex gap-4 py-3 first:pt-0 last:pb-0 items-center justify-between">
                          <div className="flex gap-3 items-center min-w-0">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border/30 bg-secondary/10">
                              <Image 
                                src={itemImageUrl} 
                                alt={item.variant?.product?.name || "Product Item"} 
                                fill 
                                className="object-cover" 
                              />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-serif text-xs font-semibold text-foreground truncate">
                                {item.variant?.product?.name || "Luxury Nail Set"}
                              </h5>
                              <p className="text-[10px] text-muted-foreground font-light truncate">
                                Variant: {item.variant?.name || item.variantId || "Default"}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-light">
                                Qty: {item.quantity} × {formatPrice(item.price)}
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

                  {/* Order footer link */}
                  <div className="px-5 py-2.5 bg-secondary/10 border-t border-border/10 flex justify-between items-center text-xs">
                    <span className="text-[10px] text-muted-foreground font-light">
                      Payment status: Successful
                    </span>
                    <Link 
                      href={`/account/orders/${order.id}`}
                      className="text-[10px] uppercase font-bold tracking-widest text-primary hover:text-accent flex items-center gap-0.5"
                    >
                      Details <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Address and Wishlist (4 cols) */}
        <section className="lg:col-span-4 space-y-8">
          {/* Default Address Preview Card */}
          <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/20">
              <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                Shipping Address
              </h3>
              <Link 
                href="/account/addresses"
                className="text-[9px] uppercase font-bold tracking-widest text-primary hover:text-accent"
              >
                Manage
              </Link>
            </div>

            {defaultAddress ? (
              <div className="text-xs font-light leading-relaxed space-y-1">
                <p className="font-semibold text-foreground">{defaultAddress.name}</p>
                <p className="text-muted-foreground">{defaultAddress.addressLine1}</p>
                {defaultAddress.addressLine2 && <p className="text-muted-foreground">{defaultAddress.addressLine2}</p>}
                <p className="text-muted-foreground">{defaultAddress.city}, {defaultAddress.state} - {defaultAddress.postalCode}</p>
                <p className="text-muted-foreground">{defaultAddress.country}</p>
                <p className="text-[10px] text-muted-foreground pt-1.5 font-medium">Phone: {defaultAddress.phone}</p>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-[11px] text-muted-foreground font-light">
                  No default shipping address saved.
                </p>
                <Link 
                  href="/account/addresses"
                  className="inline-flex justify-center items-center px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground hover:bg-muted transition-all border border-border"
                >
                  Add Address
                </Link>
              </div>
            )}
          </div>

          {/* Wishlist Preview Highlights Card */}
          <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/20">
              <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-accent shrink-0" />
                Wishlist Preview
              </h3>
              <Link 
                href="/wishlist"
                className="text-[9px] uppercase font-bold tracking-widest text-primary hover:text-accent"
              >
                View All
              </Link>
            </div>

            {wishlistProducts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground space-y-1.5">
                <p className="text-[11px] font-light">Your wishlist is currently empty.</p>
                <Link 
                  href="/shop" 
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  Browse catalog
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {wishlistProducts.map((p) => {
                  let pImageUrl = "/luxury_nails_hero.png";
                  if (p.media && p.media.length > 0 && p.media[0]?.media?.url) {
                    pImageUrl = p.media[0].media.url;
                  }

                  return (
                    <div key={p.id} className="flex gap-3 items-center justify-between text-xs">
                      <div className="flex gap-2.5 items-center min-w-0">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border/20 bg-secondary/10">
                          <Image src={pImageUrl} alt={p.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-serif text-[11px] font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-[10px] text-primary font-medium">{formatPrice(p.priceMin)}</p>
                        </div>
                      </div>

                      <Link 
                        href={`/products/${p.slug}`}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
                        title="View Product Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
