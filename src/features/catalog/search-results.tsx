"use client";

import { ProductSearchItem } from "@/services/search/fuse-search.service";
import { ProductCard } from "@/components/storefront/product-card";

interface SearchResultsProps {
  products: ProductSearchItem[];
  isLoading: boolean;
  gridCols?: 2 | 3 | 4;
}

export function SearchResults({ products, isLoading, gridCols = 3 }: SearchResultsProps) {
  const gridColClasses: Record<number, string> = {
    2: "grid-cols-2 max-w-4xl mx-auto",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  const selectedGridClass = gridColClasses[gridCols] || gridColClasses[3];

  // Renders a list of skeleton placeholders during API loading
  if (isLoading) {
    return (
      <div className={`grid ${selectedGridClass} gap-6`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-4 animate-pulse bg-card border border-border/30 rounded-2xl p-5">
            <div className="aspect-square w-full rounded-xl bg-secondary/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-secondary/30 rounded w-1/3" />
              <div className="h-5 bg-secondary/30 rounded w-3/4" />
              <div className="h-4 bg-secondary/30 rounded w-1/4" />
              <div className="h-9 bg-secondary/20 rounded-full w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${selectedGridClass} gap-6 transition-all duration-500`}>
      {products.map((product) => (
        <div key={product.id} className="animate-fade-in">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
