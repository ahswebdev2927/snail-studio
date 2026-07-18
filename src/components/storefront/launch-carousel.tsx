"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight, Bell, Sparkles, Clock } from "lucide-react";
import CountdownTimer from "./countdown-timer";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  slug: string;
  status: string;
  launchDate: string | null;
  launchTime: string | null;
  launchTimeZone: string | null;
}

interface LaunchBanner {
  id: string;
  productId: string;
  title: string;
  subtitle: string | null;
  backgroundImage: string | null;
  productImage: string | null;
  isActive: boolean;
  sortOrder: number;
  product?: Product | null;
}

interface LaunchCarouselProps {
  banners: LaunchBanner[];
}

export function LaunchCarousel({ banners }: LaunchCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-play cycling effect
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!mounted || banners.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <section className="relative w-full overflow-hidden bg-stone-950 text-white border-y border-stone-900 py-12 md:py-20">
      {/* Dynamic luxury background glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-amber-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.05),rgba(255,255,255,0))]" />

      {/* Decorative premium badge */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 md:mb-12 text-center sm:text-left z-10 relative">
        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 shadow-xs">
          <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
          Exclusive Launch Preview
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Slides container */}
        <div className="relative min-h-[460px] md:min-h-[300px]">
          {banners.map((banner, index) => {
            const product = banner.product;
            if (!product) return null;

            const isCurrent = index === currentIndex;

            return (
              <div
                key={banner.id}
                className={cn(
                  "absolute inset-0 w-full h-full flex flex-col md:flex-row items-center gap-10 transition-all duration-1000 ease-in-out transform",
                  isCurrent
                    ? "opacity-100 translate-x-0 scale-100 z-10"
                    : "opacity-0 translate-x-12 scale-97 pointer-events-none z-0"
                )}
              >
                {/* Image Section with premium double borders and glow */}
                <div className="w-full md:w-5/12 aspect-video md:aspect-[4/3] rounded-3xl overflow-hidden border border-stone-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative bg-stone-900 shrink-0 group">
                  <div className="absolute inset-0 border border-white/5 rounded-3xl z-20 pointer-events-none" />
                  
                  {banner.backgroundImage ? (
                    <img
                      src={banner.backgroundImage}
                      alt={banner.title}
                      className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-104"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-tr from-stone-950 to-stone-900 flex items-center justify-center text-muted-foreground text-xs font-light">
                      Luxury Drops
                    </div>
                  )}

                  {/* Dark elegant overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent opacity-70 group-hover:opacity-40 transition-opacity duration-700" />

                  {/* Floating product thumbnail with luxury glow */}
                  {banner.productImage && (
                    <div className="absolute bottom-4 right-4 w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl bg-stone-950/90 p-1 group-hover:scale-103 transition-transform duration-500">
                      <img 
                        src={banner.productImage} 
                        alt="Product Thumbnail" 
                        className="w-full h-full object-cover rounded-xl" 
                      />
                    </div>
                  )}
                </div>

                {/* Info and countdown controls */}
                <div className="flex-1 space-y-6 text-center md:text-left flex flex-col justify-center">
                  <div className="space-y-3">
                    <h3 className="font-serif text-3xl md:text-5xl font-light tracking-wide leading-tight text-transparent bg-clip-text bg-gradient-to-r from-stone-100 via-amber-100 to-stone-300">
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p className="font-serif italic text-stone-400 text-sm md:text-base max-w-lg leading-relaxed tracking-wide opacity-90">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Countdown clock if the status is Launching Soon */}
                  {product.status === "Launching Soon" && product.launchDate && product.launchTime ? (
                    <div className="flex justify-center md:justify-start pt-1.5">
                      <CountdownTimer
                        launchDate={product.launchDate}
                        launchTime={product.launchTime}
                        size="md"
                      />
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-stone-500 text-xs font-semibold uppercase tracking-widest pt-2 justify-center md:justify-start">
                      <Clock className="w-3.5 h-3.5" />
                      Teaser Preview Only
                    </div>
                  )}

                  {/* Call to actions with gold & glass effects */}
                  <div className="pt-3 flex flex-col sm:flex-row items-center gap-3.5 justify-center md:justify-start">
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#8C5230] to-[#B3683C] hover:from-[#9C5D37] hover:to-[#C27546] text-white text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-[#8C5230]/25"
                    >
                      <span>Explore Drop</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>

                    {product.status === "Launching Soon" && (
                      <Link
                        href={`/products/${product.slug}`}
                        className="group/alert inline-flex items-center gap-2 px-6 py-3.5 border border-stone-850 hover:border-amber-500/40 bg-stone-900/20 hover:bg-amber-500/5 text-stone-300 hover:text-amber-100 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300 hover:scale-[1.03]"
                      >
                        <Bell className="w-3.5 h-3.5 transition-transform duration-300 group-hover/alert:rotate-12" />
                        <span>Get Alerts</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel controls if banners count > 1 */}
        {banners.length > 1 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-stone-900">
            {/* Nav dots */}
            <div className="flex gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all cursor-pointer",
                    idx === currentIndex ? "bg-primary w-5" : "bg-stone-700 hover:bg-stone-600"
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Left/Right buttons */}
            <div className="flex gap-2">
              <button
                onClick={prevSlide}
                className="p-2 border border-stone-850 hover:bg-stone-900 rounded-full text-stone-400 hover:text-white transition-all cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="p-2 border border-stone-850 hover:bg-stone-900 rounded-full text-stone-400 hover:text-white transition-all cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
