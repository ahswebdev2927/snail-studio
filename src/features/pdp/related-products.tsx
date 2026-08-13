"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";

interface RelatedProductsProps {
  products: any[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) {
    return null;
  }

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const cardWidth = 280; // approximate width of card + gap
      const offset = direction === "left" ? -clientWidth * 0.8 : clientWidth * 0.8;
      
      scrollRef.current.scrollTo({
        left: scrollLeft + offset,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 border-t border-border/30">
      <div className="space-y-8">
        
        {/* Title & Scroll Navigation Buttons */}
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Recommendations
              </span>
            </div>
            <h2 className="font-serif text-2xl font-normal text-foreground">
              You May Also Like
            </h2>
          </div>
        </div>

        {/* Horizontal Scrolling Rail */}
        <div className="relative group/slider">
          {/* Left Arrow Button */}
          <button
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
            className="absolute left-[-12px] lg:left-[-24px] top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-border bg-card shadow-md flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer focus:outline-none hidden md:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
            className="absolute right-[-12px] lg:right-[-24px] top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-border bg-card shadow-md flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer focus:outline-none hidden md:flex"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth pb-4"
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="w-[280px] md:w-[300px] shrink-0 snap-start snap-always"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
