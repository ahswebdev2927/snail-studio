"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
  textColor?: string | null;
  contentAlignment?: string | null;
  lineSpacing?: string | null;
  ctaBgColor?: string | null;
  ctaTextColor?: string | null;
  isActive: boolean;
  sortOrder: number;
  product?: Product | null;
}

interface LaunchCarouselProps {
  banners: LaunchBanner[];
}

// Alignment classes mapping
const alignmentClasses: Record<string, string> = {
  left: "text-left items-start justify-start lg:text-left",
  center: "text-center items-center justify-center mx-auto lg:text-center",
  right: "text-right items-end justify-end ml-auto lg:text-right",
};

const justifyClasses: Record<string, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const lineSpacingClasses: Record<string, string> = {
  tight: "leading-tight space-y-3 md:space-y-4",
  normal: "leading-normal space-y-5 md:space-y-6",
  comfortable: "leading-relaxed space-y-7 md:space-y-8",
  loose: "leading-loose space-y-9 md:space-y-10",
};

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
    <section className="py-16 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading & Sub-heading */}
        <div className="flex flex-col sm:flex-row items-baseline justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">
              Limited Drops & Previews
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground mt-2">
              Exclusive Product Launches
            </h2>
          </div>
          {banners.length > 1 && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="p-2.5 rounded-full border border-border/40 hover:border-primary/40 bg-card hover:bg-accent text-foreground transition-all cursor-pointer shadow-xs"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="p-2.5 rounded-full border border-border/40 hover:border-primary/40 bg-card hover:bg-accent text-foreground transition-all cursor-pointer shadow-xs"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Full Hero Banner Container Box */}
        <div className="relative rounded-3xl overflow-hidden min-h-[520px] md:min-h-[600px] shadow-2xl border border-stone-800 bg-stone-950 flex items-center">
          {/* Slides */}
          {banners.map((banner, index) => {
            const product = banner.product;
            if (!product) return null;

            const isCurrent = index === currentIndex;
            const textColor = banner.textColor || "#ffffff";
            const align = banner.contentAlignment || "center";
            const spacing = banner.lineSpacing || "normal";
            const ctaBgColor = banner.ctaBgColor || "#8C5230";
            const ctaTextColor = banner.ctaTextColor || "#ffffff";

            const bannerBgImage = banner.backgroundImage || banner.productImage || "/luxury_nails_hero.png";

            return (
              <div
                key={banner.id}
                className={cn(
                  "absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out flex items-center p-6 sm:p-10 md:p-14 z-10",
                  isCurrent
                    ? "opacity-100 translate-x-0 pointer-events-auto"
                    : "opacity-0 translate-x-8 pointer-events-none"
                )}
              >
                {/* Full-bleed background image with ambient overlay mask */}
                <div className="absolute inset-0 w-full h-full">
                  <Image
                    src={bannerBgImage}
                    alt={banner.title}
                    fill
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    className="object-cover transition-transform duration-[2000ms] ease-out scale-100"
                    priority={index === 0}
                  />
                  {/* Rich dark luxury overlay for maximum text contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/65 to-stone-950/40" />
                  <div className="absolute inset-0 bg-radial-at-c from-transparent via-stone-950/30 to-stone-950/80" />
                </div>

                {/* Floating secondary product thumbnail if background image & product image are distinct */}
                {banner.productImage && banner.backgroundImage && banner.productImage !== banner.backgroundImage && (
                  <div className="hidden lg:block absolute bottom-8 right-10 w-36 h-36 rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl bg-stone-950/90 p-1.5 z-20 hover:scale-105 transition-transform duration-500">
                    <img
                      src={banner.productImage}
                      alt={banner.title}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                )}

                {/* Overlaid Content */}
                <div className="w-full max-w-7xl mx-auto relative z-20 flex items-center h-full">
                  <div
                    className={`w-full max-w-2xl flex flex-col ${alignmentClasses[align]} ${lineSpacingClasses[spacing]}`}
                    style={{ color: textColor }}
                  >
                    {/* Exclusive Badge */}
                    <div
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[10px] sm:text-xs font-bold tracking-widest uppercase backdrop-blur-md shadow-sm"
                      style={{
                        borderColor: `${textColor}40`,
                        backgroundColor: `${textColor}15`,
                        color: textColor,
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      Exclusive Launch Preview
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light tracking-wide leading-tight">
                      {banner.title}
                    </h3>

                    {/* Subtitle / Description */}
                    {banner.subtitle && (
                      <p
                        className="font-serif italic text-sm sm:text-base md:text-lg opacity-90 max-w-xl leading-relaxed"
                        style={{ color: textColor }}
                      >
                        {banner.subtitle}
                      </p>
                    )}

                    {/* Countdown Timer */}
                    {product.status === "Launching Soon" && product.launchDate && product.launchTime ? (
                      <div className={`pt-2 flex w-full ${justifyClasses[align]}`}>
                        <CountdownTimer
                          launchDate={product.launchDate}
                          launchTime={product.launchTime}
                          size="md"
                        />
                      </div>
                    ) : (
                      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest pt-2 opacity-75 ${justifyClasses[align]}`}>
                        <Clock className="w-3.5 h-3.5" />
                        Teaser Preview Only
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className={`flex flex-col sm:flex-row items-center gap-4 pt-4 w-full ${justifyClasses[align]}`}>
                      <Link
                        href={`/products/${product.slug}`}
                        className="inline-flex items-center justify-center px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                        style={{
                          backgroundColor: ctaBgColor,
                          color: ctaTextColor,
                        }}
                      >
                        <span>Explore Drop</span>
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>

                      {product.status === "Launching Soon" && (
                        <Link
                          href={`/products/${product.slug}`}
                          className="group/alert inline-flex items-center justify-center px-7 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95"
                          style={{
                            borderColor: `${textColor}50`,
                            color: textColor,
                            backgroundColor: `${textColor}1A`,
                          }}
                        >
                          <Bell className="mr-2 w-4 h-4 transition-transform duration-300 group-hover/alert:rotate-12" />
                          <span>Get Alerts</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Indicator Dots */}
          {banners.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300 cursor-pointer",
                    idx === currentIndex ? "w-6 bg-primary" : "w-2 bg-white/40 hover:bg-white/70"
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
