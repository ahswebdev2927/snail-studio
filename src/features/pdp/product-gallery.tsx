"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ZoomIn,
  ZoomOut,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Layers,
  Expand,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------- */
export interface GalleryMediaItem {
  id: string;
  url: string;
  publicId: string;
  resourceType: string; // "image" | "video" | "raw"
  format?: string | null;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
  isFeatured?: boolean;
  sortOrder?: number;
}

interface ProductGalleryProps {
  media: GalleryMediaItem[];
  productName: string;
}

/* -----------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------- */
function isVideo(item: GalleryMediaItem) {
  return (
    item.resourceType === "video" ||
    ["mp4", "webm", "ogg", "mov"].includes((item.format ?? "").toLowerCase())
  );
}

/* -----------------------------------------------------------------------
 * Lightbox Portal Component
 * --------------------------------------------------------------------- */
function Lightbox({
  items,
  startIndex,
  productName,
  onClose,
}: {
  items: GalleryMediaItem[];
  startIndex: number;
  productName: string;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const item = items[current];

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + items.length) % items.length),
    [items.length]
  );
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % items.length),
    [items.length]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#181311]/95 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} image gallery lightbox`}
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 z-10 p-2.5 rounded-full bg-primary/20 hover:bg-primary/30 text-primary-soft transition-colors cursor-pointer"
        aria-label="Close lightbox"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 text-primary-soft/60 text-xs font-medium tracking-widest uppercase">
        {current + 1} / {items.length}
      </div>

      {/* Zoom toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setZoomed((z) => !z);
        }}
        className="absolute top-5 right-16 z-10 p-2.5 rounded-full bg-primary/20 hover:bg-primary/30 text-primary-soft transition-colors cursor-pointer"
        aria-label={zoomed ? "Zoom out" : "Zoom in"}
      >
        {zoomed ? (
          <ZoomOut className="w-4 h-4" />
        ) : (
          <ZoomIn className="w-4 h-4" />
        )}
      </button>

      {/* Prev / Next */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-primary/20 hover:bg-primary/30 text-primary-soft transition-all hover:scale-105 cursor-pointer"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-primary/20 hover:bg-primary/30 text-primary-soft transition-all hover:scale-105 cursor-pointer"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Main Media */}
      <div
        className={cn(
          "relative transition-all duration-300",
          zoomed
            ? "w-full h-full overflow-auto cursor-zoom-out"
            : "w-[min(90vw,880px)] h-[min(88vh,880px)] cursor-zoom-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo(item) ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="w-full h-full object-contain"
            aria-label={item.altText || productName}
          />
        ) : (
          <Image
            src={item.url}
            alt={item.altText || productName}
            fill
            sizes="(max-width: 880px) 90vw, 880px"
            className={cn(
              "object-contain transition-transform duration-300",
              zoomed && "scale-150"
            )}
            priority
          />
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 px-4 max-w-[90vw] overflow-x-auto">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrent(i);
                setZoomed(false);
              }}
              className={cn(
                "relative w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all",
                i === current
                  ? "border-primary scale-110"
                  : "border-primary-soft/20 hover:border-primary-soft/55"
              )}
              aria-label={`View image ${i + 1}`}
            >
              {isVideo(m) ? (
                <div className="w-full h-full bg-[#181311]/50 flex items-center justify-center">
                  <Play className="w-4 h-4 text-primary-soft fill-current" />
                </div>
              ) : (
                <Image
                  src={m.url}
                  alt={m.altText || `${productName} ${i + 1}`}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

/* -----------------------------------------------------------------------
 * Main Gallery Component
 * --------------------------------------------------------------------- */
export function ProductGallery({ media, productName }: ProductGalleryProps) {
  // Sort: featured first, then by sortOrder
  const sortedMedia = [...media].sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeItem = sortedMedia[activeIndex];
  const hasMedia = sortedMedia.length > 0;

  // Auto-play video thumbnail on hover
  useEffect(() => {
    if (videoRef.current) {
      if (isHovering) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovering, activeIndex]);

  const goTo = (index: number) => {
    setActiveIndex(index);
    setIsHovering(false);
  };

  /* -------------------------------------------------------------------
   * Empty / No Media Fallback
   * ----------------------------------------------------------------- */
  if (!hasMedia) {
    return (
      <div className="flex flex-col gap-4">
        <div className="aspect-square w-full rounded-2xl bg-secondary/40 border border-border flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Layers className="w-16 h-16 opacity-20" />
          <p className="text-sm font-light tracking-wide">No images yet</p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------
   * Render
   * ----------------------------------------------------------------- */
  return (
    <div className="flex flex-col gap-4">
      {/* ---- Main Viewer ---- */}
      <div
        className="relative aspect-square w-full rounded-2xl overflow-hidden bg-secondary/30 border border-border/50 group cursor-zoom-in"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => setLightboxOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={`View ${activeItem.altText || productName} in full size`}
        onKeyDown={(e) => e.key === "Enter" && setLightboxOpen(true)}
      >
        {isVideo(activeItem) ? (
          /* Video player */
          <video
            ref={videoRef}
            src={activeItem.url}
            muted
            loop
            playsInline
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            aria-label={activeItem.altText || productName}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
          />
        ) : (
          /* Image with zoom */
          <Image
            src={activeItem.url}
            alt={activeItem.altText || productName}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 620px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            priority
          />
        )}

        {/* Expand hint overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181311]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="absolute bottom-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/30 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <Expand className="w-4 h-4 text-foreground/70" />
        </div>

        {/* Video play badge */}
        {isVideo(activeItem) && !isHovering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-4 rounded-full bg-background/70 backdrop-blur-sm border border-border/30">
              <Play className="w-8 h-8 text-primary fill-current" />
            </div>
          </div>
        )}

        {/* Image counter badge */}
        {sortedMedia.length > 1 && (
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border/20 text-[10px] font-semibold text-foreground/70 pointer-events-none">
            {activeIndex + 1} / {sortedMedia.length}
          </div>
        )}
      </div>

      {/* ---- Thumbnail Rail ---- */}
      {sortedMedia.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {sortedMedia.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo(i)}
              className={cn(
                "relative w-[72px] h-[72px] shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer",
                i === activeIndex
                  ? "border-primary shadow-sm shadow-primary/20 scale-[1.04]"
                  : "border-border/40 hover:border-primary/50 hover:scale-[1.02]"
              )}
              aria-label={`Select image ${i + 1}`}
              aria-pressed={i === activeIndex}
            >
              {isVideo(item) ? (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <Play className="w-5 h-5 text-primary fill-current" />
                </div>
              ) : (
                <Image
                  src={item.url}
                  alt={item.altText || `${productName} ${i + 1}`}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              )}

              {/* Active indicator */}
              {i === activeIndex && (
                <div className="absolute inset-0 ring-2 ring-primary/30 ring-inset rounded-xl pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ---- Lightbox ---- */}
      {lightboxOpen && (
        <Lightbox
          items={sortedMedia}
          startIndex={activeIndex}
          productName={productName}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
