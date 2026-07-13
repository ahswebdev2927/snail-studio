"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Sparkles, TrendingUp, SlidersHorizontal, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { Modal } from "../ui/modal";
import { formatPrice } from "@/lib/utils";
import { ProductSearchItem } from "@/services/search/fuse-search.service";

interface SearchSuggestion {
  type: "query" | "category" | "attribute" | "product";
  text: string;
  url: string;
  slug?: string;
  value?: string;
  group?: string;
}

interface ThumbnailProduct {
  media?: {
    media: {
      url: string;
      altText?: string | null;
    };
  }[];
  images?: {
    url: string;
    isFeatured?: boolean;
    sortOrder?: number;
  }[];
  image?: string;
  imageUrl?: string;
}

// Static quick categories for storefront recommendations
const QUICK_CATEGORIES = [
  { name: "Almond Shape", slug: "almond", url: "/shop?shape=almond" },
  { name: "Coffin Shape", slug: "coffin", url: "/shop?shape=coffin" },
  { name: "Cat Eye Effect", slug: "cat-eye", url: "/shop?texture=cat-eye" },
  { name: "Matte Sets", slug: "matte", url: "/shop?texture=matte" },
  { name: "Ombre Designs", slug: "ombre", url: "/shop?style=ombre" },
  { name: "French Tips", slug: "french-tips", url: "/shop?style=french-tips" },
];

/**
 * Extracts a thumbnail image URL safely from a product search result.
 */
function getProductThumbnail(product: ThumbnailProduct): string {
  let images: string[] = [];
  if (product.media && Array.isArray(product.media)) {
    images = product.media
      .map((item) => {
        if (item && typeof item === "object" && item.media && item.media.url) {
          return item.media.url;
        }
        return "";
      })
      .filter((url) => !!url);
  } else if (product.images && Array.isArray(product.images)) {
    images = product.images
      .map((item) => {
        if (item && typeof item === "object" && item.url) return item.url;
        return "";
      })
      .filter((url) => !!url);
  }
  if (images.length === 0 && product.image) {
    images = [product.image];
  }
  if (images.length === 0 && product.imageUrl) {
    images = [product.imageUrl];
  }
  return images[0] || "/luxury_nails_hero.png";
}

/**
 * Renders appropriate icon for each suggestion type.
 */
function getSuggestionIcon(type: string) {
  switch (type) {
    case "query":
      return <Search className="w-3.5 h-3.5 text-muted-foreground/60" />;
    case "category":
      return <Sparkles className="w-3.5 h-3.5 text-primary/70" />;
    case "attribute":
      return <SlidersHorizontal className="w-3.5 h-3.5 text-accent/70" />;
    case "product":
      return <ShoppingBag className="w-3.5 h-3.5 text-accent/70" />;
    default:
      return <Search className="w-3.5 h-3.5 text-muted-foreground/60" />;
  }
}

export function SearchOverlay() {
  const router = useRouter();
  const searchOpen = useCartStore((state) => state.searchOpen);
  const setSearchOpen = useCartStore((state) => state.setSearchOpen);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic States
  const [popularQueries, setPopularQueries] = useState<string[]>([]);
  const [defaultProducts, setDefaultProducts] = useState<ProductSearchItem[]>([]);
  const [results, setResults] = useState<ProductSearchItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Unified close & state reset function
  const handleClose = () => {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
    setSuggestions([]);
    setTotalCount(0);
    setLoading(false);
  };

  // Sync Overlay Open/Close
  useEffect(() => {
    if (searchOpen) {
      // Focus search input after animation
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      // Fetch dynamic popular queries
      fetch("/api/search/popular")
        .then((res) => res.json())
        .then((data: { queries?: string[] }) => {
          if (data.queries) {
            setPopularQueries(data.queries);
          }
        })
        .catch((err) => console.error("Error fetching popular queries:", err));

      // Fetch default trending/featured products
      fetch("/api/search?featured=true&limit=3")
        .then((res) => res.json())
        .then((data: { products?: ProductSearchItem[] }) => {
          if (data.products) {
            setDefaultProducts(data.products);
          }
        })
        .catch((err) => console.error("Error fetching default products:", err));

      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  // Live Instant Search (Debounced 300ms)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const [resProducts, resSuggestions] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=4`),
          fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`)
        ]);

        if (resProducts.ok && resSuggestions.ok) {
          const productsData = (await resProducts.json()) as { products?: ProductSearchItem[]; pagination?: { totalItems?: number } };
          const suggestionsData = (await resSuggestions.json()) as { suggestions?: SearchSuggestion[] };

          setResults(productsData.products || []);
          setTotalCount(productsData.pagination?.totalItems || 0);
          setSuggestions(suggestionsData.suggestions || []);
        }
      } catch (error) {
        console.error("Failed to execute live search:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Send search query to logging service
  const logSearch = async (q: string, count: number) => {
    try {
      await fetch("/api/search/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, resultsCount: count }),
      });
    } catch (err) {
      console.error("Error logging search query:", err);
    }
  };

  const handleSearchRedirect = async (searchTerm: string, resultsCount: number = 0) => {
    if (!searchTerm.trim()) return;
    handleClose();
    await logSearch(searchTerm.trim(), resultsCount);
    router.push(`/shop?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleSuggestionClick = async (s: SearchSuggestion) => {
    handleClose();
    await logSearch(s.text, s.type === "product" ? 1 : 0);
    router.push(s.url);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length >= 2) {
      setLoading(true);
    } else {
      setResults([]);
      setSuggestions([]);
      setTotalCount(0);
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchRedirect(query, totalCount);
  };

  return (
    <Modal
      isOpen={searchOpen}
      onClose={handleClose}
      className="max-w-4xl w-full rounded-3xl"
    >
      <div className="flex flex-col space-y-6 pt-4 max-h-[80vh]">
        {/* Search Header Title */}
        <div className="flex items-center gap-2 border-b border-border/10 pb-3">
          <Search className="w-5 h-5 text-primary animate-pulse" />
          <h2 className="font-serif text-lg text-foreground font-normal">
            Search our <span className="font-serif italic font-light text-primary">collections</span>
          </h2>
        </div>

        {/* Input Form */}
        <form onSubmit={onSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search nails, shapes, colors, or collections..."
            className="w-full bg-transparent border border-border/40 focus:border-primary/50 focus:outline-hidden focus:ring-1 focus:ring-primary/20 rounded-full py-4.5 pl-6 pr-14 text-sm text-foreground transition-all placeholder:text-muted-foreground/60 font-light"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-2.5 rounded-full hover:bg-primary/95 transition-all duration-300 hover:scale-105 cursor-pointer"
            aria-label="Submit search"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 overflow-y-auto pr-2 pb-4">
          
          {/* Left Column: Suggestions or Defaults */}
          <div className="md:col-span-5 space-y-6">
            {query.trim().length < 2 ? (
              // Default View: Popular Searches + Quick Categories
              <>
                {/* Popular Searches */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5 text-accent" />
                    <span>Popular Searches</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {popularQueries.length > 0
                      ? popularQueries.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => handleSearchRedirect(tag)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full bg-secondary/40 hover:bg-primary hover:text-primary-foreground border border-border/30 hover:border-transparent transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-accent shrink-0" />
                            {tag}
                          </button>
                        ))
                      : QUICK_CATEGORIES.slice(0, 3).map((cat) => (
                          <button
                            key={cat.slug}
                            onClick={() => handleSearchRedirect(cat.name)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full bg-secondary/40 hover:bg-primary hover:text-primary-foreground border border-border/30 hover:border-transparent transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-accent shrink-0" />
                            {cat.name}
                          </button>
                        ))}
                  </div>
                </div>

                {/* Quick Categories */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    <span>Quick Categories</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_CATEGORIES.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={cat.url}
                        onClick={() => {
                          handleClose();
                          logSearch(cat.name, 1);
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-secondary/15 hover:bg-secondary/35 border border-border/20 text-xs font-medium text-foreground/80 hover:text-primary transition-all duration-200"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // Query Typing View: Live Suggestions / Autocomplete
              <div className="space-y-3.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Suggestions
                </div>
                {suggestions.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {suggestions.map((s, idx) => (
                      <Link
                        key={idx}
                        href={s.url}
                        onClick={() => handleSuggestionClick(s)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 text-sm text-foreground/80 hover:text-primary transition-all duration-200 group"
                      >
                        {getSuggestionIcon(s.type)}
                        <span className="font-light truncate">{s.text}</span>
                        <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/80 font-light italic pl-1">
                    No matching suggestions. Press Enter to search catalog.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Live Product Matches */}
          <div className="md:col-span-7 space-y-4 border-t md:border-t-0 md:border-l border-border/10 pt-6 md:pt-0 md:pl-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
              <span>{query.trim().length >= 2 ? "Live Matches" : "Featured Products"}</span>
              {query.trim().length >= 2 && results.length > 0 && (
                <span className="text-[10px] text-primary bg-primary/10 px-2.5 py-0.5 rounded-full font-medium">
                  {totalCount} Found
                </span>
              )}
            </div>

            {loading ? (
              // Shimmer skeletons during fetching
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-4 p-3 rounded-2xl border border-border/20 animate-pulse">
                    <div className="w-16 h-16 rounded-xl bg-secondary/30" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-secondary/30 rounded w-1/3" />
                      <div className="h-4 bg-secondary/30 rounded w-3/4" />
                      <div className="h-3 bg-secondary/20 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : query.trim().length < 2 ? (
              // Default View: Featured Products
              <div className="flex flex-col gap-3">
                {defaultProducts.slice(0, 3).map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    onClick={() => {
                      handleClose();
                      logSearch(product.name, 1);
                    }}
                    className="flex items-center gap-4 p-3 rounded-2xl bg-secondary/10 hover:bg-secondary/35 border border-border/10 hover:border-primary/10 transition-all duration-300 group"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-background shrink-0 border border-border/20">
                      <Image
                        src={getProductThumbnail(product)}
                        alt={product.name}
                        fill
                        sizes="64px"
                        className="object-cover group-hover:scale-105 transition-transform duration-350"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-sm text-foreground group-hover:text-primary transition-colors truncate font-normal leading-tight">
                        {product.name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-light mt-0.5 capitalize">
                        {product.categoryName || "Premium Nails"}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-sm font-medium text-foreground">
                          {formatPrice(product.priceMin)}
                        </span>
                        {product.priceMin !== product.priceMax && (
                          <span className="text-xs text-muted-foreground font-light">
                            - {formatPrice(product.priceMax)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                  </Link>
                ))}
              </div>
            ) : results.length > 0 ? (
              // Live Matches Results View
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 max-h-[48vh] overflow-y-auto pr-1">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={() => {
                        handleClose();
                        logSearch(product.name, 1);
                      }}
                      className="flex items-center gap-4 p-3 rounded-2xl bg-secondary/10 hover:bg-secondary/35 border border-border/10 hover:border-primary/10 transition-all duration-300 group animate-fade-in"
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-background shrink-0 border border-border/20">
                        <Image
                          src={getProductThumbnail(product)}
                          alt={product.name}
                          fill
                          sizes="64px"
                          className="object-cover group-hover:scale-105 transition-transform duration-350"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif text-sm text-foreground group-hover:text-primary transition-colors truncate font-normal leading-tight">
                          {product.name}
                        </h4>
                        <p className="text-xs text-muted-foreground font-light mt-0.5 capitalize">
                          {product.categoryName || "Press-On Set"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-medium text-foreground">
                            {formatPrice(product.priceMin)}
                          </span>
                          {product.priceMin !== product.priceMax && (
                            <span className="text-xs text-muted-foreground font-light">
                              - {formatPrice(product.priceMax)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                    </Link>
                  ))}
                </div>

                {/* View All results redirection */}
                <button
                  onClick={() => handleSearchRedirect(query, totalCount)}
                  className="w-full mt-2 py-3.5 bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 font-medium rounded-2xl text-xs flex items-center justify-center gap-2 group cursor-pointer hover:shadow-md"
                >
                  View All {totalCount} Results
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              // Empty Search Results State
              <div className="flex flex-col items-center justify-center text-center p-8 bg-secondary/10 rounded-2xl border border-border/20">
                <Sparkles className="w-10 h-10 text-primary/40 mb-3 animate-pulse" />
                <p className="text-sm font-serif text-foreground font-normal">
                  No matching sets found for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground/80 font-light mt-1.5 max-w-xs leading-relaxed">
                  Try checking your spelling or looking for shapes like <code className="px-1 py-0.5 bg-background border border-border/40 rounded font-mono font-medium">coffin</code> or colors like <code className="px-1 py-0.5 bg-background border border-border/40 rounded font-mono font-medium">pink</code>.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </Modal>
  );
}
