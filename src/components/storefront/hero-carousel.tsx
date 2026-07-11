"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  textColor?: string | null;
  contentAlignment?: string | null;
  lineSpacing?: string | null;
}

interface HeroCarouselProps {
  banners: Banner[];
}

// Helper to determine if hex color is light or dark for optimal contrast styling
const isLightColor = (colorHex: string) => {
  try {
    const hex = colorHex.replace("#", "");
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 150;
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  } catch {
    return true; // default light
  }
};

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Hover arrows state
  const [showPrevBtn, setShowPrevBtn] = useState(false);
  const [showNextBtn, setShowNextBtn] = useState(false);

  // Touch swiping state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  // Default fallback slides if none are present in the DB
  const defaultSlides = [
    {
      id: "default-1",
      imageUrl: "/luxury_nails_hero.png",
      title: "Elegance at Your Fingertips",
      subtitle: "Indulge in couture, hand-designed press-on nails that look and feel like high-end gel manicures. Reusable, non-damaging, and applied in minutes.",
      ctaText: "Explore Collections",
      ctaLink: "/shop",
      textColor: "#ffffff",
      contentAlignment: "center",
      lineSpacing: "normal"
    },
    {
      id: "default-2",
      imageUrl: "/emerald_nails_set.png",
      title: "Salon Quality. At Home.",
      subtitle: "Experience high-end styling and convenience without harming your natural nails. Custom-designed sets tailored to fit your lifestyle.",
      ctaText: "Shop New Sets",
      ctaLink: "/shop?sort=newest",
      textColor: "#ffffff",
      contentAlignment: "center",
      lineSpacing: "normal"
    }
  ];

  const slides = banners.length > 0 ? banners : defaultSlides;

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  // Auto sliding logic: change slide every 3 seconds (3000ms), every 5 seconds (5000ms) on hover
  useEffect(() => {
    const intervalTime = isHovered ? 5000 : 3000;

    const timer = setInterval(() => {
      nextSlide();
    }, intervalTime);

    return () => clearInterval(timer);
  }, [nextSlide, isHovered]);

  // Mouse move handler to show buttons when cursor is close to the edges
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Show button if cursor is within 15% of the edge (max 150px)
    const edgeThreshold = Math.min(150, width * 0.15);
    setShowPrevBtn(x < edgeThreshold);
    setShowNextBtn(x > width - edgeThreshold);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowPrevBtn(false);
    setShowNextBtn(false);
  };

  // Touch gesture swiping handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  // CSS mappings for alignment, justify, and line height/gaps
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

  const trustIndicatorAlign: Record<string, string> = {
    left: "lg:mx-0 mr-auto",
    center: "mx-auto",
    right: "lg:ml-auto lg:mr-0 ml-auto",
  };

  const lineSpacingClasses: Record<string, string> = {
    tight: "leading-tight space-y-4",
    normal: "leading-normal space-y-6",
    comfortable: "leading-relaxed space-y-8",
    loose: "leading-loose space-y-10",
  };

  return (
    <section 
      ref={sectionRef}
      className="relative overflow-hidden w-full bg-black min-h-[600px] lg:min-h-[700px] flex items-center"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Container */}
      <div className="w-full relative h-[600px] lg:h-[700px] flex items-center">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          
          // Fallbacks for customizable fields
          const textColor = slide.textColor || "#ffffff";
          const align = slide.contentAlignment || "center";
          const spacing = slide.lineSpacing || "normal";
          
          const isTextLight = isLightColor(textColor);
          const overlayClass = isTextLight ? "bg-black/35" : "bg-black/10";
          const ctaBgColor = textColor;
          const ctaTextColor = isTextLight ? "#1A1513" : "#ffffff";

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out flex items-center z-10 ${
                isActive 
                  ? "opacity-100 translate-x-0 pointer-events-auto" 
                  : "opacity-0 translate-x-8 pointer-events-none"
              }`}
            >
              {/* Full-bleed background image */}
              <div className="absolute inset-0 w-full h-full">
                <Image
                  src={slide.imageUrl}
                  alt={slide.title}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={index === 0}
                />
                <div className={`absolute inset-0 transition-colors duration-500 ${overlayClass}`} />
              </div>

              {/* Overlaid Content Grid */}
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full flex items-center relative z-20">
                <div 
                  className={`w-full max-w-3xl flex flex-col ${alignmentClasses[align]} ${lineSpacingClasses[spacing]}`}
                  style={{ color: textColor }}
                >
                  {/* Subtitle tag */}
                  {slide.subtitle && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase backdrop-blur-xs transition-colors"
                      style={{ 
                        borderColor: `${textColor}33`, 
                        backgroundColor: `${textColor}10`,
                        color: textColor
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {slide.subtitle}
                    </div>
                  )}
                  
                  {/* Title */}
                  <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight">
                    {slide.title.includes("at Your") ? (
                      <>
                        {slide.title.split("at Your")[0]}at Your <span className="font-serif italic font-light opacity-95">Fingertips</span>
                      </>
                    ) : (
                      slide.title
                    )}
                  </h1>

                  {/* Buttons/CTA Links */}
                  <div className={`flex flex-col sm:flex-row gap-4 w-full ${justifyClasses[align]}`}>
                    {slide.ctaText && slide.ctaLink && (
                      <Link
                        href={slide.ctaLink}
                        className="inline-flex items-center justify-center px-8 py-3.5 rounded-full text-xs font-semibold tracking-widest uppercase transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                        style={{
                          backgroundColor: ctaBgColor,
                          color: ctaTextColor
                        }}
                      >
                        {slide.ctaText}
                        <ArrowRight className="ml-2 w-3.5 h-3.5" />
                      </Link>
                    )}
                    <Link
                      href="/sizing-guide"
                      className="inline-flex items-center justify-center px-8 py-3.5 rounded-full text-xs font-semibold tracking-widest uppercase border transition-all hover:scale-105 active:scale-95 backdrop-blur-xs"
                      style={{
                        borderColor: `${textColor}4D`,
                        color: textColor,
                        backgroundColor: `${textColor}1A`
                      }}
                    >
                      Find Your Size
                    </Link>
                  </div>

                  {/* Trust Indicators */}
                  <div 
                    className={`grid grid-cols-3 gap-6 pt-6 border-t max-w-md w-full ${trustIndicatorAlign[align]}`}
                    style={{ borderColor: `${textColor}33` }}
                  >
                    <div>
                      <div className="font-serif text-xl sm:text-2xl font-bold">100%</div>
                      <div className="text-[9px] uppercase tracking-widest opacity-80 mt-1">Reusable</div>
                    </div>
                    <div>
                      <div className="font-serif text-xl sm:text-2xl font-bold">15 Min</div>
                      <div className="text-[9px] uppercase tracking-widest opacity-80 mt-1">Easy Application</div>
                    </div>
                    <div>
                      <div className="font-serif text-xl sm:text-2xl font-bold">14+ Days</div>
                      <div className="text-[9px] uppercase tracking-widest opacity-80 mt-1">Wear Time</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (Appear on hover close to the edge) */}
      <button
        onClick={prevSlide}
        className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-background/80 backdrop-blur-xs border border-border/20 text-muted-foreground hover:text-foreground hover:bg-background shadow-xs cursor-pointer transition-all duration-300 ${
          showPrevBtn ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
        }`}
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={nextSlide}
        className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-background/80 backdrop-blur-xs border border-border/20 text-muted-foreground hover:text-foreground hover:bg-background shadow-xs cursor-pointer transition-all duration-300 ${
          showNextBtn ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
        }`}
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
