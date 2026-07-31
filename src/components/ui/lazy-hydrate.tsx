"use client";

import React, { useState, useEffect, useRef } from "react";

interface LazyHydrateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number | number[];
}

export function LazyHydrate({
  children,
  fallback = null,
  rootMargin = "150px", // Hydrate 150px before entering viewport for a seamless experience
  threshold = 0,
}: LazyHydrateProps) {
  const [shouldHydrate, setShouldHydrate] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldHydrate) return;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setShouldHydrate(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldHydrate(true);
        }
      },
      { rootMargin, threshold }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [shouldHydrate, rootMargin, threshold]);

  if (!shouldHydrate) {
    return (
      <div ref={containerRef} className="w-full">
        {fallback}
      </div>
    );
  }

  return <>{children}</>;
}
