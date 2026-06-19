"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Sparkles, TrendingUp } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { Modal } from "../ui/modal";

const popularTags = [
  "Emerald Coffin",
  "Blush Pink Marble",
  "Gold French Tips",
  "Velvet Cat Eye",
  "Matte Summer",
  "Short Almond Set",
];

export function SearchOverlay() {
  const router = useRouter();
  const searchOpen = useCartStore((state) => state.searchOpen);
  const setSearchOpen = useCartStore((state) => state.setSearchOpen);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      // Focus input after modal animations
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setQuery("");
    }
  }, [searchOpen]);

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setSearchOpen(false);
    router.push(`/shop?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <Modal
      isOpen={searchOpen}
      onClose={() => setSearchOpen(false)}
      className="max-w-2xl rounded-3xl"
    >
      <div className="flex flex-col space-y-6 pt-4">
        {/* Search Title */}
        <div className="flex items-center gap-2 border-b border-border/10 pb-3">
          <Search className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-lg text-foreground font-normal">
            Search our <span className="font-serif italic font-light text-primary">collections</span>
          </h2>
        </div>

        {/* Input form */}
        <form onSubmit={onSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nails, shapes, colors, or collections..."
            className="w-full bg-secondary/30 border border-border/40 focus:border-primary/50 focus:outline-hidden focus:ring-1 focus:ring-primary/20 rounded-full py-4.5 pl-6 pr-14 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 font-light"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-2.5 rounded-full hover:bg-primary/95 transition-colors cursor-pointer"
            aria-label="Submit search"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Popular searches suggestions */}
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5 text-accent" />
            <span>Popular Searches</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleSearch(tag)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full bg-secondary/40 hover:bg-primary hover:text-primary-foreground border border-border/30 hover:border-transparent transition-all cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-accent shrink-0" />
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Tips section */}
        <div className="bg-secondary/15 rounded-2xl p-4.5 border border-border/20 text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground font-medium uppercase tracking-widest text-[9px] block mb-1">Search Tip</strong>
          Try searching for attributes like <code className="px-1 py-0.5 bg-background border border-border/40 rounded font-mono font-medium">almond</code>, <code className="px-1 py-0.5 bg-background border border-border/40 rounded font-mono font-medium">matte</code>, or <code className="px-1 py-0.5 bg-background border border-border/40 rounded font-mono font-medium">emerald</code> to quickly filter down matching sets.
        </div>
      </div>
    </Modal>
  );
}
