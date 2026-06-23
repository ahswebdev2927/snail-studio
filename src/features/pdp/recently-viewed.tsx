"use client";

import React, { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";

/* -----------------------------------------------------------------------
 * RecentlyViewedTracker — Client Tracker Component
 * --------------------------------------------------------------------- */
interface TrackerProps {
  slug: string;
}

export function RecentlyViewedTracker({ slug }: TrackerProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Helper to get cookie value
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()!.split(";").shift() ?? null;
      return null;
    };

    // Helper to set cookie
    const setCookie = (name: string, val: string, days: number) => {
      const maxAge = days * 24 * 60 * 60;
      document.cookie = `${name}=${val}; path=/; max-age=${maxAge}; SameSite=Lax`;
    };

    const saved = getCookie("snail_recently_viewed");
    let slugs = saved ? saved.split(",") : [];

    // Add current slug, removing existing duplicate references
    slugs = [slug, ...slugs.filter((s) => s && s !== slug)].slice(0, 6);

    setCookie("snail_recently_viewed", slugs.join(","), 30);
  }, [slug]);

  return null; // Silent render
}

/* -----------------------------------------------------------------------
 * RecentlyViewed — Slider Carousel Component
 * --------------------------------------------------------------------- */
interface RecentlyViewedProps {
  products: any[];
}

export function RecentlyViewed({ products }: RecentlyViewedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) {
    return null;
  }

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
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
        
        {/* Title & Navigation */}
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                History
              </span>
            </div>
            <h2 className="font-serif text-2xl font-normal text-foreground">
              Recently Viewed Products
            </h2>
          </div>

          {/* Navigation Arrows */}
          <div className="flex gap-2">
            <button
              onClick={() => handleScroll("left")}
              aria-label="Scroll left"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer focus:outline-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              aria-label="Scroll right"
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer focus:outline-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scroll Rail */}
        <div className="relative">
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
