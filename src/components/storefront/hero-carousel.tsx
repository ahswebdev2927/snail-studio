"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
}

interface HeroCarouselProps {
  banners: Banner[];
}

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Default fallback slides if none are present in the DB
  const defaultSlides = [
    {
      id: "default-1",
      imageUrl: "/luxury_nails_hero.png",
      title: "Elegance at Your Fingertips",
      subtitle: "Indulge in couture, hand-designed press-on nails that look and feel like high-end gel manicures. Reusable, non-damaging, and applied in minutes.",
      ctaText: "Explore Collections",
      ctaLink: "/shop",
    },
    {
      id: "default-2",
      imageUrl: "/emerald_nails_set.png",
      title: "Salon Quality. At Home.",
      subtitle: "Experience high-end styling and convenience without harming your natural nails. Custom-designed sets tailored to fit your lifestyle.",
      ctaText: "Shop New Sets",
      ctaLink: "/shop?sort=newest",
    }
  ];

  const slides = banners.length > 0 ? banners : defaultSlides;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  // Auto sliding logic
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 6000);

    return () => clearInterval(timer);
  }, [nextSlide, isPaused]);

  return (
    <section 
      className="relative overflow-hidden w-full bg-gradient-to-b from-secondary to-background min-h-[600px] lg:min-h-[700px] flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides Container */}
      <div className="w-full relative h-[600px] lg:h-[700px] flex items-center">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out flex items-center z-10 ${
                isActive 
                  ? "opacity-100 translate-x-0 pointer-events-auto" 
                  : "opacity-0 translate-x-8 pointer-events-none"
              }`}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
                  {/* Hero Text */}
                  <div className="lg:col-span-5 space-y-8 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium tracking-wide animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      Salon Quality. At Home.
                    </div>
                    
                    <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight text-foreground">
                      {slide.title.includes("at Your") ? (
                        <>
                          {slide.title.split("at Your")[0]}at Your <span className="font-serif italic font-light text-primary">Fingertips</span>
                        </>
                      ) : (
                        slide.title
                      )}
                    </h1>

                    {slide.subtitle && (
                      <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                        {slide.subtitle}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                      {slide.ctaText && slide.ctaLink && (
                        <Link
                          href={slide.ctaLink}
                          className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-semibold tracking-wider uppercase bg-primary text-primary-foreground hover:bg-primary/95 shadow-md hover:shadow-lg transition-all group"
                        >
                          {slide.ctaText}
                          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      )}
                      <Link
                        href="/sizing-guide"
                        className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-semibold tracking-wider uppercase border border-border bg-background/50 backdrop-blur-xs hover:bg-background transition-all"
                      >
                        Find Your Size
                      </Link>
                    </div>

                    {/* Trust Indicators */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40 max-w-md mx-auto lg:mx-0">
                      <div>
                        <div className="font-serif text-2xl font-semibold text-primary">100%</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Reusable</div>
                      </div>
                      <div>
                        <div className="font-serif text-2xl font-semibold text-primary">15 Min</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Easy Application</div>
                      </div>
                      <div>
                        <div className="font-serif text-2xl font-semibold text-primary">14+ Days</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Wear Time</div>
                      </div>
                    </div>
                  </div>

                  {/* Hero Image Display */}
                  <div className="lg:col-span-7 flex justify-center">
                    <div className="relative w-full max-w-lg aspect-square lg:max-w-xl rounded-2xl overflow-hidden shadow-2xl border-4 border-card/40 bg-card">
                      <Image
                        src={slide.imageUrl}
                        alt={slide.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover hover:scale-105 transition-transform duration-700"
                        priority={index === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                      {slide.ctaText && slide.ctaLink && (
                        <div className="absolute bottom-6 left-6 right-6 p-6 rounded-xl bg-background/80 backdrop-blur-xs border border-border/40 shadow-lg flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Featured Collection</span>
                            <h3 className="font-serif text-base text-foreground mt-0.5">{slide.title}</h3>
                          </div>
                          <Link
                            href={slide.ctaLink}
                            className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-sm"
                            aria-label={slide.ctaText}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-background/80 backdrop-blur-xs border border-border/20 text-muted-foreground hover:text-foreground hover:bg-background transition-all shadow-xs cursor-pointer"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-background/80 backdrop-blur-xs border border-border/20 text-muted-foreground hover:text-foreground hover:bg-background transition-all shadow-xs cursor-pointer"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Indicator Dots */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              index === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/40"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
