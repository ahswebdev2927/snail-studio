"use client";

import { ProductSearchItem } from "@/services/search/fuse-search.service";
import { Star, ShoppingBag } from "lucide-react";
import Image from "next/image";

interface SearchResultsProps {
  products: ProductSearchItem[];
  isLoading: boolean;
}

export function SearchResults({ products, isLoading }: SearchResultsProps) {
  // Renders a list of skeleton placeholders during API loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-4 animate-pulse">
            <div className="aspect-square w-full rounded-2xl bg-secondary/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 bg-secondary/30 rounded w-1/3" />
              <div className="h-4.5 bg-secondary/30 rounded w-3/4" />
              <div className="h-4 bg-secondary/30 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => {
        // Grab cover image or fallback
        const coverImage = product.images?.[0]?.url || "/luxury_nails_hero.png";
        
        // Format price (converting paise to INR)
        const displayPrice = (product.priceMin / 100).toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        });

        // Generate a beauty rating metric based on id hash for visuals
        const rating = 4.5 + (product.name.charCodeAt(0) % 6) * 0.1;
        const reviewsCount = 10 + (product.name.charCodeAt(product.name.length - 1) % 45);

        return (
          <div
            key={product.id}
            className="group flex flex-col bg-background/50 border border-border/30 hover:border-primary/20 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-lg hover:-translate-y-1"
          >
            {/* Image Container */}
            <div className="aspect-square w-full relative overflow-hidden bg-secondary/15">
              {/* Badges */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
                {product.isFeatured && (
                  <span className="text-[9px] font-semibold tracking-wider uppercase bg-primary text-primary-foreground px-2.5 py-1 rounded-full shadow-sm">
                    Featured
                  </span>
                )}
                {product.isBestSeller && (
                  <span className="text-[9px] font-semibold tracking-wider uppercase bg-accent text-accent-foreground px-2.5 py-1 rounded-full shadow-sm">
                    Best Seller
                  </span>
                )}
              </div>

              {/* Cover Image */}
              <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-700 ease-out">
                <Image
                  src={coverImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  className="object-cover"
                  priority={false}
                />
              </div>

              {/* Quick Action Overlay */}
              <div className="absolute inset-0 bg-neutral-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                <button
                  className="p-3 bg-background text-foreground hover:bg-primary hover:text-primary-foreground rounded-full shadow-md transition-all duration-300 transform scale-90 group-hover:scale-100 cursor-pointer"
                  aria-label="Add to cart"
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Product Details */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                {/* Brand */}
                {product.brandName && (
                  <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/85 block">
                    {product.brandName}
                  </span>
                )}

                {/* Name */}
                <h4 className="font-serif text-sm font-normal text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {product.name}
                </h4>

                {/* Sizing / Attribute Summary Tags */}
                <div className="flex flex-wrap gap-1 pt-1 opacity-80">
                  {product.attributes.slice(0, 2).map((attr) => (
                    <span key={attr.valueCode} className="text-[9px] bg-secondary/30 px-1.5 py-0.5 rounded text-muted-foreground">
                      {attr.value}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-border/10">
                <span className="font-semibold text-sm text-foreground">
                  {displayPrice}
                </span>

                {/* Star rating info */}
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-medium text-foreground">{rating.toFixed(1)}</span>
                  <span className="text-[9px] text-muted-foreground/60">({reviewsCount})</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
