"use client";

import React, { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { incrementProductViews } from "./actions";

/* -----------------------------------------------------------------------
 * RecentlyViewedTracker — Client Tracker Component
 * --------------------------------------------------------------------- */
export interface TrackerProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  priceMin: number;
  priceMax: number;
  rating?: number;
  reviewsCount?: number;
  images: { url: string }[];
}

interface TrackerProps {
  product: TrackerProduct;
}

export function RecentlyViewedTracker({ product }: TrackerProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !product) return;

    // Increment views via server action
    incrementProductViews(product.id).catch((err) =>
      console.error("Failed to increment views:", err)
    );

    try {
      const saved = localStorage.getItem("snail_recently_viewed");
      let items = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(items)) {
        items = [];
      }

      // Filter out any existing copy of this product to avoid duplicates
      items = items.filter((item: any) => item && item.id !== product.id);

      // Prepend current product and keep at most 10 items
      items = [product, ...items].slice(0, 10);

      localStorage.setItem("snail_recently_viewed", JSON.stringify(items));
    } catch (e) {
      console.error("Error updating recently viewed products:", e);
    }
  }, [product]);

  return null; // Silent render tracker
}

/* -----------------------------------------------------------------------
 * RecentlyViewed — Slider Carousel Component
 * --------------------------------------------------------------------- */
interface RecentlyViewedProps {
  currentSlug?: string;
}

export function RecentlyViewed({ currentSlug }: RecentlyViewedProps) {
  const [viewedProducts, setViewedProducts] = useState<TrackerProduct[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem("snail_recently_viewed");
      let items = saved ? JSON.parse(saved) : [];
      if (Array.isArray(items)) {
        // Exclude current product if we are on a Product Details Page
        if (currentSlug) {
          items = items.filter((item: any) => item && item.slug !== currentSlug);
        }
        setViewedProducts(items);
      }
    } catch (e) {
      console.error("Error loading recently viewed products:", e);
    }
  }, [currentSlug]);

  if (viewedProducts.length === 0) {
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12 border-t border-border/30">
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
            {viewedProducts.map((product) => (
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
