"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Heart, MessageCircle, X, ChevronLeft, ChevronRight } from "lucide-react";

// Local SVG implementation of Instagram icon since brand icons are absent in this lucide-react version
const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface InstagramPost {
  id: string;
  imageUrl: string;
  likes: number;
  comments: number;
  tag: string;
  caption: string;
}

const INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: "post_1",
    imageUrl: "/luxury_coffin_nails.png",
    likes: 342,
    comments: 18,
    tag: "@snailstudio",
    caption: "Couture Coffin nails featuring hand-painted gold leaf flakes. ✨ Tap the link in bio to shop the 'Emerald Glamour Coffin Set'.",
  },
  {
    id: "post_2",
    imageUrl: "/blush_marble_nails.png",
    likes: 512,
    comments: 24,
    tag: "@snailstudio",
    caption: "Blush Marble & Gold Leaf magic. Perfect for weddings, events, or when you just want to feel like royalty. 🌸💍",
  },
  {
    id: "post_3",
    imageUrl: "/french_chrome_nails.png",
    likes: 289,
    comments: 14,
    tag: "@snailstudio",
    caption: "Chic chrome tips to elevate your daily style. Reusable, non-damaging, and applied in 10 minutes. 💅✨",
  },
  {
    id: "post_4",
    imageUrl: "/emerald_gold_nails.png",
    likes: 476,
    comments: 31,
    tag: "@snailstudio",
    caption: "Deep emerald velvet stiletto nails adorned with delicate gold stars and moons. Celestial elegance at your fingertips. 🌙⭐️",
  },
  {
    id: "post_5",
    imageUrl: "/minimalist_nude_nails.png",
    likes: 215,
    comments: 9,
    tag: "@snailstudio",
    caption: "Milky nude base with delicate micro-dot details. The ultimate clean girl aesthetic. 🤍💅",
  },
  {
    id: "post_6",
    imageUrl: "/holographic_glitter_nails.png",
    likes: 624,
    comments: 42,
    tag: "@snailstudio",
    caption: "Holographic glitter dust catching the light from every angle. Are you ready for the weekend? ✨🌌",
  },
  {
    id: "post_7",
    imageUrl: "/emerald_nails_set.png",
    likes: 395,
    comments: 22,
    tag: "@snailstudio",
    caption: "Signature Emerald Matte coffin set close-up. Notice the fine textures and handcrafted perfection. Only at Snail Studio.",
  },
  {
    id: "post_8",
    imageUrl: "/luxury_nails_hero.png",
    likes: 488,
    comments: 19,
    tag: "@snailstudio",
    caption: "Our premium studio workspace where every nail set is carefully handcrafted. Quality without compromise. 🕊️💫",
  },
];

export function InstagramGallery() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handlePrev = useCallback(() => {
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev !== null ? (prev - 1 + INSTAGRAM_POSTS.length) % INSTAGRAM_POSTS.length : null));
  }, [selectedIdx]);

  const handleNext = useCallback(() => {
    if (selectedIdx === null) return;
    setSelectedIdx((prev) => (prev !== null ? (prev + 1) % INSTAGRAM_POSTS.length : null));
  }, [selectedIdx]);

  const handleClose = useCallback(() => {
    setSelectedIdx(null);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (selectedIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    // Lock body scroll
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedIdx, handleClose, handlePrev, handleNext]);

  return (
    <section className="py-20 bg-background border-t border-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-widest text-primary font-semibold">
            Social Showcase
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-foreground">
            Shop the Look
          </h2>
          <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-md mx-auto">
            Get inspired by our community. Share your Snail Studio nails on Instagram using <span className="font-medium text-foreground">#SnailStudioNails</span> for a chance to be featured.
          </p>
        </div>

        {/* 4x2 Grid of Instagram Posts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {INSTAGRAM_POSTS.map((post, idx) => (
            <button
              key={post.id}
              onClick={() => setSelectedIdx(idx)}
              className="group relative aspect-square w-full rounded-2xl overflow-hidden border border-border/10 bg-card cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-300"
            >
              {/* Image */}
              <Image
                src={post.imageUrl}
                alt={post.caption}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />

              {/* Dark Gold Translucent Overlay */}
              <div className="absolute inset-0 bg-primary/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-4">
                <Instagram className="w-7 h-7 mb-3 text-accent animate-pulse" />
                
                <div className="flex gap-4 text-xs font-semibold tracking-wide">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 fill-white" />
                    {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                    {post.comments}
                  </span>
                </div>

                <span className="mt-4 text-[10px] uppercase font-bold tracking-widest text-accent-foreground bg-accent px-2.5 py-0.5 rounded-full shadow-xs">
                  {post.tag}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox / Modal Viewer */}
      {selectedIdx !== null && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fade-in"
          onClick={handleClose}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            aria-label="Close Lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Controls */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            aria-label="Previous Image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            aria-label="Next Image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Image & Detail Container */}
          <div 
            className="relative max-w-4xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row aspect-video max-h-[85vh] md:max-h-[80vh] my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Side: Image */}
            <div className="relative flex-1 bg-black aspect-square md:aspect-auto">
              <Image
                src={INSTAGRAM_POSTS[selectedIdx].imageUrl}
                alt={INSTAGRAM_POSTS[selectedIdx].caption}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain"
              />
            </div>

            {/* Right Side: Info and Details */}
            <div className="w-full md:w-80 bg-neutral-900 flex flex-col p-6 text-white justify-between border-t md:border-t-0 md:border-l border-neutral-800 flex-shrink-0">
              {/* Header Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent via-primary to-rose-400 p-[2px]">
                    <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center">
                      <span className="font-serif text-xs font-bold text-accent">SS</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold tracking-wide text-white">snailstudio</h4>
                    <span className="text-[10px] text-accent font-medium">Verified Handcrafted</span>
                  </div>
                </div>

                <hr className="border-neutral-800" />

                {/* Caption */}
                <p className="text-xs text-neutral-300 font-light leading-relaxed">
                  {INSTAGRAM_POSTS[selectedIdx].caption}
                </p>
              </div>

              {/* Engagement & Actions */}
              <div className="space-y-4 pt-4 md:pt-0">
                <hr className="border-neutral-800" />

                <div className="flex justify-between items-center text-xs">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1 font-semibold">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      {INSTAGRAM_POSTS[selectedIdx].likes} likes
                    </span>
                    <span className="flex items-center gap-1 text-neutral-400">
                      <MessageCircle className="w-4 h-4" />
                      {INSTAGRAM_POSTS[selectedIdx].comments} comments
                    </span>
                  </div>
                  <span className="text-[10px] text-accent tracking-widest uppercase font-bold">
                    {INSTAGRAM_POSTS[selectedIdx].tag}
                  </span>
                </div>

                <a
                  href="/shop"
                  className="w-full inline-flex items-center justify-center py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase bg-accent text-accent-foreground hover:bg-accent-hover transition-colors text-center cursor-pointer"
                >
                  Shop This Look
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default InstagramGallery;
