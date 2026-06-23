"use client";

import React, { useState } from "react";
import {
  Star,
  Heart,
  Share2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Layers,
  Shield,
  Tag,
  Package,
} from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PdpBreadcrumb, BreadcrumbItem } from "./pdp-breadcrumb";

/* -----------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------- */
export interface PdpVariant {
  id: string;
  sku: string;
  name: string;
  price: number;        // in paise
  compareAtPrice?: number | null; // in paise
  status: "Active" | "Disabled" | "Archived";
  stockLevel: number;
  lowStockThreshold: number;
}

export interface ProductInfoProps {
  product: {
    id: string;
    name: string;
    slug: string;
    shortDescription?: string | null;
    description?: string | null;
    priceMin: number;
    priceMax: number;
    isBestSeller?: boolean;
    isNewArrival?: boolean;
    isTrending?: boolean;
    isFeatured?: boolean;
    status: string;
    sku?: string | null;
    category?: { name: string; slug: string } | null;
    brand?: { name: string; slug: string } | null;
    reviewCount: number;
    averageRating: number;
  };
  variants: PdpVariant[];
  breadcrumbs: BreadcrumbItem[];
}

/* -----------------------------------------------------------------------
 * Availability Badge
 * --------------------------------------------------------------------- */
function AvailabilityBadge({
  stockLevel,
  threshold,
}: {
  stockLevel: number;
  threshold: number;
}) {
  if (stockLevel <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
        <XCircle className="w-3.5 h-3.5" />
        Out of Stock
      </span>
    );
  }
  if (stockLevel <= threshold) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5" />
        Only {stockLevel} left!
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="w-3.5 h-3.5" />
      In Stock
    </span>
  );
}

/* -----------------------------------------------------------------------
 * Star Rating Display
 * --------------------------------------------------------------------- */
function StarRating({ rating, count }: { rating: number; count: number }) {
  const filled = Math.floor(rating);
  const partial = rating % 1;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFull = star <= filled;
          const isPartial = !isFull && star === filled + 1 && partial > 0;
          return (
            <span key={star} className="relative inline-block">
              {/* Background star */}
              <Star className="w-4 h-4 text-border fill-border" />
              {/* Foreground star (full or partial) */}
              {(isFull || isPartial) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: isFull ? "100%" : `${partial * 100}%` }}
                >
                  <Star className="w-4 h-4 text-accent fill-accent" />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-sm font-semibold text-foreground">
        {rating.toFixed(1)}
      </span>
      {count > 0 && (
        <a
          href="#reviews"
          className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
        >
          ({count} review{count !== 1 ? "s" : ""})
        </a>
      )}
      {count === 0 && (
        <span className="text-xs text-muted-foreground">(No reviews yet)</span>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Trust Badges
 * --------------------------------------------------------------------- */
function TrustBadges() {
  const badges = [
    {
      icon: Sparkles,
      title: "Handcrafted Art",
      desc: "Every set designed by salon professionals",
    },
    {
      icon: Layers,
      title: "Multi-Use",
      desc: "Reapply up to 5× with glue tabs",
    },
    {
      icon: Shield,
      title: "Secure Fit",
      desc: "Cuticle wand & prep pad included",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {badges.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border/30"
        >
          <div className="p-2 rounded-full bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">
              {title}
            </p>
            <p className="text-[9px] text-muted-foreground font-light leading-snug mt-0.5">
              {desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Main ProductInfo Component
 * --------------------------------------------------------------------- */
export function ProductInfo({
  product,
  variants,
  breadcrumbs,
}: ProductInfoProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const toggleWishlist = useCartStore((s) => s.toggleWishlist);
  const isInWishlist = useCartStore((s) => s.isInWishlist);

  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const favorite = isInWishlist(product.id);

  /* -- Pricing logic -- */
  const activeVariants = variants.filter((v) => v.status === "Active");

  // Best compareAtPrice for a discount display (use the first active variant that has one)
  const firstVariantWithSale = activeVariants.find(
    (v) => v.compareAtPrice && v.compareAtPrice > v.price
  );
  const hasSalePrice = !!firstVariantWithSale;

  const salePrice = hasSalePrice ? firstVariantWithSale!.price : null;
  const originalPrice = hasSalePrice
    ? firstVariantWithSale!.compareAtPrice!
    : null;
  const discountPct =
    hasSalePrice && originalPrice
      ? Math.round(((originalPrice - salePrice!) / originalPrice) * 100)
      : null;

  const displayPrice =
    product.priceMin === product.priceMax
      ? formatPrice(product.priceMin)
      : `${formatPrice(product.priceMin)} – ${formatPrice(product.priceMax)}`;

  /* -- Stock logic -- */
  // Show overall stock (sum of active variants)
  const totalStock = activeVariants.reduce((sum, v) => sum + v.stockLevel, 0);
  const minThreshold = Math.max(
    ...activeVariants.map((v) => v.lowStockThreshold)
  );
  const lowestThreshold = activeVariants.length
    ? Math.min(...activeVariants.map((v) => v.lowStockThreshold))
    : 5;
  const isOutOfStock = product.status === "Out Of Stock" || totalStock <= 0;

  /* -- First active variant SKU for display -- */
  const displaySku =
    product.sku || activeVariants[0]?.sku || "—";

  /* -- Add to cart -- */
  const handleAddToCart = () => {
    if (isOutOfStock) return;
    setIsAdding(true);

    const firstVariant = activeVariants[0];
    addToCart({
      id: product.id,
      name: product.name,
      price: (firstVariant?.price ?? product.priceMin) / 100,
      variantName: firstVariant?.name ?? "Standard Set",
    });

    setTimeout(() => setIsAdding(false), 900);
  };

  /* -- Share -- */
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch (_) {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* -------------------------------------------------------------------
   * Render
   * ----------------------------------------------------------------- */
  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <PdpBreadcrumb items={breadcrumbs} />

      {/* Badges row */}
      <div className="flex flex-wrap gap-2">
        {product.isBestSeller && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-primary text-primary-foreground">
            <Star className="w-2.5 h-2.5 fill-current" />
            Best Seller
          </span>
        )}
        {product.isNewArrival && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-foreground text-background">
            New Arrival
          </span>
        )}
        {product.isTrending && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-accent/20 text-accent-foreground border border-accent/30">
            Trending
          </span>
        )}
        {hasSalePrice && discountPct && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Tag className="w-2.5 h-2.5" />
            {discountPct}% Off
          </span>
        )}
      </div>

      {/* Category label */}
      {product.category && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
          {product.category.name}
        </p>
      )}

      {/* Product name */}
      <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground leading-tight">
        {product.name}
      </h1>

      {/* Rating */}
      <StarRating
        rating={product.averageRating}
        count={product.reviewCount}
      />

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Price section */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Price
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-serif text-3xl font-medium text-primary">
            {hasSalePrice && salePrice
              ? formatPrice(salePrice)
              : displayPrice}
          </span>
          {hasSalePrice && originalPrice && (
            <span className="font-serif text-xl text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>
      </div>

      {/* Availability + SKU */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <AvailabilityBadge
          stockLevel={isOutOfStock ? 0 : totalStock}
          threshold={lowestThreshold}
        />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Package className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono">
            SKU: <span className="text-foreground font-semibold">{displaySku}</span>
          </span>
        </div>
      </div>

      {/* Short description */}
      {product.shortDescription && (
        <p className="text-sm text-muted-foreground leading-relaxed font-light">
          {product.shortDescription}
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3">
        {/* Add to Cart */}
        <button
          type="button"
          id="pdp-add-to-cart"
          onClick={handleAddToCart}
          disabled={isAdding || isOutOfStock}
          className={cn(
            "w-full py-4 rounded-full text-sm font-semibold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
            isOutOfStock
              ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
              : isAdding
              ? "bg-primary/80 text-primary-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
          )}
          aria-label={isOutOfStock ? "Out of stock" : "Add to cart"}
        >
          {isAdding ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              Adding…
            </>
          ) : isOutOfStock ? (
            "Out of Stock"
          ) : (
            "Add to Cart"
          )}
        </button>

        {/* Secondary row: Wishlist + Share */}
        <div className="flex gap-3">
          <button
            type="button"
            id="pdp-wishlist"
            onClick={() => toggleWishlist(product.id)}
            className={cn(
              "flex-1 py-3.5 rounded-full text-sm font-semibold uppercase tracking-wider border transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
              favorite
                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-300/50"
                : "bg-transparent text-foreground border-border hover:border-primary/50 hover:text-primary"
            )}
            aria-label={favorite ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-all",
                favorite && "fill-current"
              )}
            />
            {favorite ? "Wishlisted" : "Wishlist"}
          </button>

          <button
            type="button"
            id="pdp-share"
            onClick={handleShare}
            className="flex-1 py-3.5 rounded-full text-sm font-semibold uppercase tracking-wider border border-border hover:border-primary/50 hover:text-primary text-foreground transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            aria-label="Share product"
          >
            <Share2 className="w-4 h-4" />
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* Trust Badges */}
      <TrustBadges />
    </div>
  );
}
