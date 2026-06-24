"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight, Loader2 } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { ProductCard } from "@/components/storefront/product-card";
import { getWishlistProducts } from "./actions";

export default function WishlistClient() {
  const wishlistIds = useCartStore((state) => state.wishlist);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync state whenever the Zustand wishlist store changes
  useEffect(() => {
    const currentIds = new Set(products.map((p) => p.id));
    const hasNewItems = wishlistIds.some((id) => !currentIds.has(id));

    if (hasNewItems || (wishlistIds.length > 0 && products.length === 0)) {
      const fetchWishlist = async () => {
        if (products.length === 0) {
          setLoading(true);
        } else {
          setIsSyncing(true);
        }

        try {
          const res = await getWishlistProducts(wishlistIds);
          if (res.success && res.products) {
            setProducts(res.products);
          }
        } catch (err) {
          console.error("Failed to load wishlist products:", err);
        } finally {
          setLoading(false);
          setIsSyncing(false);
        }
      };
      fetchWishlist();
    } else {
      // Optimistic filter: instantly filter out items removed from the wishlist store
      setProducts((prev) => prev.filter((p) => wishlistIds.includes(p.id)));
    }
  }, [wishlistIds]);

  // Loading State with Skeleton Shimmers
  if (loading) {
    return (
      <div className="flex-1 bg-background text-foreground max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 w-32 bg-secondary/40 rounded-md animate-pulse mb-6" />

        {/* Title Skeleton */}
        <div className="h-10 w-48 bg-secondary/40 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-secondary/40 rounded-md animate-pulse mb-10" />

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card rounded-2xl overflow-hidden border border-border/30 p-5 space-y-4"
            >
              <div className="aspect-square w-full bg-secondary/40 rounded-xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-4.5 w-3/4 bg-secondary/40 rounded-md animate-pulse" />
                <div className="h-3.5 w-1/2 bg-secondary/40 rounded-md animate-pulse" />
              </div>
              <div className="pt-3 border-t border-border/20 flex justify-between items-center">
                <div className="h-4 w-12 bg-secondary/40 rounded-md animate-pulse" />
                <div className="h-5 w-20 bg-secondary/40 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background text-foreground max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Breadcrumb */}
      <nav className="flex mb-6 text-xs text-muted-foreground font-light font-sans gap-2" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary transition-colors cursor-pointer">
          Home
        </Link>
        <span>/</span>
        <span className="text-foreground">Wishlist</span>
      </nav>

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-10">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-wide text-foreground flex items-center gap-3">
            Your Wishlist
            {products.length > 0 && (
              <span className="font-sans font-light text-muted-foreground text-lg md:text-xl">
                ({products.length})
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground font-light font-sans mt-1">
            Handcrafted luxury press-on nail sets curated by you.
          </p>
        </div>
        {isSyncing && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse font-sans">
            <Loader2 className="w-3 h-3 animate-spin text-primary" /> Updating...
          </span>
        )}
      </div>

      {/* Grid Content */}
      {products.length === 0 ? (
        // Premium Empty State
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-card/30 border border-border/25 rounded-3xl backdrop-blur-xs max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 rounded-full bg-rose-500/5 flex items-center justify-center border border-rose-500/10 shadow-xs relative">
            <Heart className="w-8 h-8 text-rose-500/75 fill-rose-500/5 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl text-foreground font-semibold">
              Your wishlist is empty
            </h2>
            <p className="text-xs text-muted-foreground font-light max-w-sm mx-auto leading-relaxed font-sans">
              Add your favorite premium press-on nail styles here to track them, review variations, and prepare your next order.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 shadow-md group cursor-pointer"
          >
            Explore Catalog
            <ArrowRight className="w-3.5 h-3.5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      ) : (
        // Products Grid
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
          {products.map((product) => (
            <div
              key={product.id}
              className="transition-all duration-500 ease-in-out transform hover:-translate-y-0.5"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
