"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  rating: number;
  quote: string;
  verified: boolean;
  date: string;
  product: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "test_1",
    name: "Ananya R.",
    rating: 5,
    quote: "Absolutely blown away by the quality. They feel extremely sturdy and the finish is identical to a professional gel manicure. Got so many compliments on the emerald set!",
    verified: true,
    date: "June 15, 2026",
    product: "Emerald Glamour Coffin Set",
    initials: "AR",
  },
  {
    id: "test_2",
    name: "Priya S.",
    rating: 5,
    quote: "Application took less than 15 minutes, and they lasted a full two weeks without budging. I love that I can pop them off and reuse them again next month.",
    verified: true,
    date: "June 10, 2026",
    product: "Blush Marble & Gold Leaf",
    initials: "PS",
  },
  {
    id: "test_3",
    name: "Kriti M.",
    rating: 5,
    quote: "Beautiful packaging and the sizing was perfect. Snail Studio has saved me so much time and money compared to my usual bi-weekly salon visits.",
    verified: true,
    date: "June 05, 2026",
    product: "French Classic Almond",
    initials: "KM",
  },
  {
    id: "test_4",
    name: "Tanya K.",
    rating: 5,
    quote: "Midnight Starlet Stiletto is a showstopper! The holographic glitter is so reflective under flash. Perfect for parties and nights out.",
    verified: true,
    date: "June 18, 2026",
    product: "Midnight Starlet Stiletto",
    initials: "TK",
  },
  {
    id: "test_5",
    name: "Divya N.",
    rating: 5,
    quote: "I was skeptical about press-on nails, but these completely changed my mind. The custom size fit perfectly, and they look so natural.",
    verified: true,
    date: "June 12, 2026",
    product: "Minimalist Nude Set",
    initials: "DN",
  },
  {
    id: "test_6",
    name: "Meera J.",
    rating: 5,
    quote: "Outstanding customer service and the nails are literally wearable art. The packaging feels like opening a high-end jewelry box.",
    verified: true,
    date: "June 16, 2026",
    product: "Blush Marble & Gold Leaf",
    initials: "MJ",
  },
];

export function CustomerTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(3);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const autoSlideTimer = useRef<NodeJS.Timeout | null>(null);

  // Minimum swipe distance to trigger slide
  const minSwipeDistance = 50;

  // Handle responsive visible card counts
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setVisibleCards(1);
      } else if (window.innerWidth < 1024) {
        setVisibleCards(2);
      } else {
        setVisibleCards(3);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxIndex = TESTIMONIALS.length - visibleCards;

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  }, [maxIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  }, [maxIndex]);

  // Adjust index if visible cards count changes and pushes current index out of bounds
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex >= 0 ? maxIndex : 0);
    }
  }, [visibleCards, maxIndex, currentIndex]);

  // Touch handlers for mobile swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  // Auto scroll logic
  useEffect(() => {
    if (isHovered) {
      if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
      return;
    }

    autoSlideTimer.current = setInterval(() => {
      handleNext();
    }, 6000);

    return () => {
      if (autoSlideTimer.current) clearInterval(autoSlideTimer.current);
    };
  }, [handleNext, isHovered]);

  return (
    <section 
      id="reviews" 
      className="py-16 bg-background border-t border-border/20 relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visual Background Accent Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">Love Notes</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground">
              What Our Customers Say
            </h2>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              Discover real experiences from our clients who swapped time-consuming salon visits for premium, salon-grade press-ons.
            </p>
          </div>

          {/* Navigation Arrows */}
          <div className="flex gap-3">
            <button
              onClick={handlePrev}
              className="p-3 rounded-full border border-border/40 bg-card text-foreground hover:bg-primary/10 hover:border-primary/30 active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none"
              aria-label="Previous Testimonials"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-3 rounded-full border border-border/40 bg-card text-foreground hover:bg-primary/10 hover:border-primary/30 active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none"
              aria-label="Next Testimonials"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel Slider Track */}
        <div 
          className="overflow-hidden touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div 
            className="flex transition-transform duration-500 ease-out gap-6"
            style={{
              transform: `translateX(-${currentIndex * (100 / visibleCards)}%)`,
            }}
          >
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.id}
                className="w-full flex-shrink-0 bg-card border border-border/30 rounded-3xl p-8 sm:p-10 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-md transition-all duration-300 relative group"
                style={{
                  width: `calc(${100 / visibleCards}% - ${(visibleCards - 1) * 24 / visibleCards}px)`
                }}
              >
                {/* Gold Stars & Verification */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1 text-accent">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>

                  {testimonial.verified && (
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-950">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      Verified Buy
                    </span>
                  )}
                </div>

                {/* Quote */}
                <blockquote className="text-sm font-light text-muted-foreground leading-relaxed italic flex-1">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                {/* Details Footer */}
                <div className="space-y-4 pt-4 border-t border-border/20">
                  <div className="flex items-center gap-3">
                    {/* User Avatar Initials */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                      {testimonial.initials}
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="text-xs font-semibold text-foreground">{testimonial.name}</h4>
                      <span className="text-[10px] text-muted-foreground block">{testimonial.date}</span>
                    </div>
                  </div>

                  {/* Product Tag */}
                  <div className="flex items-center justify-between text-[10px] bg-secondary/30 rounded-xl px-3.5 py-1.5 border border-border/20">
                    <span className="text-muted-foreground font-light">Purchased Style:</span>
                    <span className="font-semibold text-primary">{testimonial.product}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Indicators Dots */}
        {maxIndex > 0 && (
          <div className="flex justify-center gap-2 pt-4">
            {[...Array(maxIndex + 1)].map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === idx 
                    ? "w-8 bg-primary" 
                    : "w-2 bg-border/80 hover:bg-border-hover"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CustomerTestimonials;
