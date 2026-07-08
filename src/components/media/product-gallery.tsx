"use client";

import React, { useState } from "react";
import { CloudinaryImage } from "./cloudinary-image";
import { CloudinaryVideo } from "./cloudinary-video";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

interface GalleryMediaItem {
  id: string;
  url: string;
  publicId: string;
  resourceType: "image" | "video";
  altText?: string | null;
}

interface ProductGalleryProps {
  mediaList: GalleryMediaItem[];
  className?: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  mediaList = [],
  className = "",
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!mediaList || mediaList.length === 0) {
    return (
      <div className="flex items-center justify-center w-full aspect-square rounded-xl bg-primary/5 border border-primary/20">
        <span className="text-muted-foreground text-sm">No media available</span>
      </div>
    );
  }

  const activeMedia = mediaList[activeIndex];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % mediaList.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div className={`flex flex-col gap-4 w-full ${className}`}>
      <div className="relative aspect-square w-full bg-secondary-surface/40 rounded-2xl overflow-hidden border border-border/40 shadow-sm group">
        {activeMedia.resourceType === "image" ? (
          <div
            className="w-full h-full overflow-hidden cursor-zoom-in"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseMove={handleMouseMove}
          >
            <div
              className="w-full h-full transition-transform duration-150 ease-out"
              style={{
                transform: hovered ? "scale(1.5)" : "scale(1)",
                transformOrigin: hovered ? `${mousePos.x}% ${mousePos.y}%` : "center",
              }}
            >
              <CloudinaryImage
                src={activeMedia.url}
                variant="page"
                alt={activeMedia.altText || "Product Gallery"}
                className="w-full h-full rounded-none"
              />
            </div>
          </div>
        ) : (
          <CloudinaryVideo
            src={activeMedia.url}
            className="w-full h-full rounded-none"
            autoplayOnScroll={false}
            autoPlay
          />
        )}

        {mediaList.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-card/90 backdrop-blur-md border border-border text-foreground shadow-md hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-card/90 backdrop-blur-md border border-border text-foreground shadow-md hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {mediaList.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/30">
          {mediaList.map((media, index) => (
            <button
              key={media.id}
              onClick={() => setActiveIndex(index)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border transition-all duration-200 ${
                activeIndex === index
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {media.resourceType === "image" ? (
                <CloudinaryImage
                  src={media.url}
                  variant="thumbnail"
                  alt={media.altText || "Thumbnail"}
                  className="w-full h-full rounded-none"
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-primary/5 dark:bg-primary/10">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
