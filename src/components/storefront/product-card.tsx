"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { formatPrice } from "@/lib/utils";

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    shortDescription?: string | null;
    priceMin: number; // Stored in paise
    priceMax: number; // Stored in paise
    isBestSeller?: boolean;
    isNewArrival?: boolean;
    isTrending?: boolean;
    rating?: number;
    reviewCount?: number;
    reviewsCount?: number;
    media?: {
      media: {
        url: string;
        altText?: string | null;
      };
    }[];
    images?: {
      url: string;
      isFeatured?: boolean;
      sortOrder?: number;
    }[];
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useCartStore((state) => state.toggleWishlist);
  const isInWishlist = useCartStore((state) => state.isInWishlist);
  const [isAdding, setIsAdding] = useState(false);

  const favorite = isInWishlist(product.id);

  // Extract media items safely to handle different query patterns
  let images: string[] = [];
  if (product.media && Array.isArray(product.media)) {
    images = product.media
      .map((item: any) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          if (item.media && typeof item.media === "object" && item.media.url) {
            return item.media.url;
          }
          if (item.url) return item.url;
        }
        return "";
      })
      .filter((url) => !!url);
  } else if (product.images && Array.isArray(product.images)) {
    images = product.images
      .map((item: any) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && item.url) return item.url;
        return "";
      })
      .filter((url) => !!url);
  }

  // Fallbacks for mock data compatibility
  if (images.length === 0 && (product as any).image) {
    images = [(product as any).image];
  }
  if (images.length === 0 && (product as any).imageUrl) {
    images = [(product as any).imageUrl];
  }
  if (images.length === 0) {
    images = ["/luxury_nails_hero.png"];
  }

  const primaryImage = images[0];
  const secondaryImage = images[1] || images[0];

  // Normalise price to Rupees for local use-cart-store, which handles normalising
  const priceInRupees = product.priceMin / 100;
  const isRange = product.priceMin !== product.priceMax;

  // Format pricing for display
  const displayPrice = isRange
    ? `${formatPrice(product.priceMin)} - ${formatPrice(product.priceMax)}`
    : formatPrice(product.priceMin);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAdding(true);
    addToCart({
      id: product.id,
      name: product.name,
      price: priceInRupees,
      imageUrl: primaryImage,
      variantName: "Standard Set",
    });
    setTimeout(() => setIsAdding(false), 800);
  };

  const reviewsCount = product.reviewsCount ?? product.reviewCount ?? 0;
  const ratingValue = product.rating ?? 4.8;

  return (
    <div className="group flex flex-col bg-card rounded-2xl overflow-hidden border border-border/30 hover:border-primary/20 hover:shadow-lg transition-all duration-300 relative">
      {/* Product Image Container */}
      <Link href={`/products/${product.slug}`} className="relative aspect-square w-full overflow-hidden block">
        {/* Main image */}
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className={`object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
            images.length > 1 ? "group-hover:opacity-0" : ""
          }`}
        />
        
        {/* Secondary image (hover crossfade) */}
        {images.length > 1 && (
          <Image
            src={secondaryImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
          />
        )}

        {/* Float Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
          {product.isBestSeller && (
            <span className="px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest bg-primary text-primary-foreground shadow-sm rounded-md border border-primary/20">
              Best Seller
            </span>
          )}
          {product.isNewArrival && (
            <span className="px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest bg-foreground text-background shadow-sm rounded-md">
              New
            </span>
          )}
        </div>

        {/* Heart Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-background/90 hover:bg-background border border-border/25 shadow-xs text-muted-foreground hover:text-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer z-20"
          aria-label="Toggle Wishlist"
        >
          <Heart
            className={`w-4 h-4 transition-all duration-300 ${
              favorite ? "fill-rose-500 text-rose-500 scale-105" : ""
            }`}
          />
        </button>
      </Link>

      {/* Product Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Rating */}
          <div className="flex items-center gap-1 text-accent">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-[11px] font-semibold text-foreground">{ratingValue.toFixed(1)}</span>
            {reviewsCount > 0 ? (
              <span className="text-[10px] text-muted-foreground">({reviewsCount} reviews)</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">(New)</span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-serif text-base text-foreground font-medium group-hover:text-primary transition-colors line-clamp-1">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>

          {/* Description */}
          {(product.shortDescription || product.description) && (
            <p className="text-xs text-muted-foreground leading-relaxed font-light line-clamp-2">
              {product.shortDescription || product.description}
            </p>
          )}
        </div>

        {/* Pricing & Add to Cart */}
        <div className="space-y-3 pt-3 border-t border-border/20">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-light">Price</span>
            <span className="font-serif text-lg font-semibold text-primary">{displayPrice}</span>
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={isAdding}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground disabled:bg-muted disabled:text-muted-foreground border border-primary/20 hover:border-transparent transition-all duration-300 cursor-pointer"
          >
            {isAdding ? (
              <>Adding...</>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 mr-2" />
                Quick Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
