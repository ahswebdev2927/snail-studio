"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./product-card";

interface ProductSliderProps {
  products: any[];
}

export function ProductSlider({ products }: ProductSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) {
    return null;
  }

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const offset = direction === "left" ? -clientWidth * 0.85 : clientWidth * 0.85;
      
      scrollRef.current.scrollTo({
        left: scrollLeft + offset,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative group/slider w-full">
      {/* Scroll Rail */}
      <div
        ref={scrollRef}
        className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth pb-4 px-1"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[260px] sm:w-[290px] shrink-0 snap-start snap-always"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Navigation Arrows for touch devices / small screens (optional but good for accessibility) */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={() => handleScroll("left")}
          aria-label="Scroll left"
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer focus:outline-none"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleScroll("right")}
          aria-label="Scroll right"
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer focus:outline-none"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
