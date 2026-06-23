"use client";

import React from "react";
import { Star } from "lucide-react";
import { PdpBreadcrumb, BreadcrumbItem } from "./pdp-breadcrumb";

/* -----------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------- */
export interface ProductInfoProps {
  product: {
    id: string;
    name: string;
    slug: string;
    shortDescription?: string | null;
    isBestSeller?: boolean;
    isNewArrival?: boolean;
    isTrending?: boolean;
    isFeatured?: boolean;
    category?: { name: string; slug: string } | null;
    reviewCount: number;
    averageRating: number;
  };
  breadcrumbs: BreadcrumbItem[];
}

/* -----------------------------------------------------------------------
 * Star Rating Display
 * --------------------------------------------------------------------- */
function StarRating({ rating, count }: { rating: number; count: number }) {
  const filled  = Math.floor(rating);
  const partial = rating % 1;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFull    = star <= filled;
          const isPartial = !isFull && star === filled + 1 && partial > 0;
          return (
            <span key={star} className="relative inline-block">
              {/* Background (empty) star */}
              <Star className="w-4 h-4 text-border fill-border" />
              {/* Foreground star — full or partial clip */}
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

      {count > 0 ? (
        <a
          href="#reviews"
          className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
        >
          ({count} review{count !== 1 ? "s" : ""})
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">(No reviews yet)</span>
      )}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Main ProductInfo — static, server-rendered-friendly
 * --------------------------------------------------------------------- */
export function ProductInfo({ product, breadcrumbs }: ProductInfoProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <PdpBreadcrumb items={breadcrumbs} />

      {/* Status badges */}
      {(product.isBestSeller || product.isNewArrival || product.isTrending) && (
        <div className="flex flex-wrap gap-2">
          {product.isBestSeller && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-primary text-primary-foreground">
              <Star className="w-2.5 h-2.5 fill-current" />
              Best Seller
            </span>
          )}
          {product.isNewArrival && (
            <span className="px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-foreground text-background">
              New Arrival
            </span>
          )}
          {product.isTrending && (
            <span className="px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-accent/20 text-accent-foreground border border-accent/30">
              Trending
            </span>
          )}
        </div>
      )}

      {/* Category label */}
      {product.category && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
          {product.category.name}
        </p>
      )}

      {/* Product name — single h1 per page */}
      <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground leading-tight">
        {product.name}
      </h1>

      {/* Star rating */}
      <StarRating rating={product.averageRating} count={product.reviewCount} />

      {/* Short description */}
      {product.shortDescription && (
        <p className="text-sm text-muted-foreground leading-relaxed font-light">
          {product.shortDescription}
        </p>
      )}
    </div>
  );
}
