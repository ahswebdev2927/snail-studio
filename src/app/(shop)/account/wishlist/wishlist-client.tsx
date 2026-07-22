"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, ArrowRight } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { ProductCard } from "@/components/storefront/product-card";
import { getWishlistProducts } from "@/features/wishlist/actions";

export function AccountWishlistClient() {
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
          console.error("Failed to load wishlist products inside account portal:", err);
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
      <div className="space-y-8 w-full">
        <div className="space-y-1 pb-4 border-b border-border/20">
          <div className="h-7 w-44 bg-secondary/40 rounded-md animate-pulse" />
          <div className="h-4 w-60 bg-secondary/40 rounded-md animate-pulse mt-1" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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
    <div className="space-y-8 w-full">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/20">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-semibold text-foreground tracking-wide flex items-center gap-2">
            <Heart className="w-5 h-5 text-accent shrink-0" />
            My Wishlist
            {products.length > 0 && (
              <span className="font-sans font-light text-muted-foreground text-base">
                ({products.length})
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground font-light">
            Manage your curated premium press-on styles.
          </p>
        </div>
        {isSyncing && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse font-sans self-start sm:self-auto">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Updating...
          </span>
        )}
      </div>

      {/* Grid Content */}
      {products.length === 0 ? (
        <div className="py-16 text-center space-y-5 border border-dashed border-border/40 rounded-3xl bg-secondary/5">
          <div className="w-16 h-16 rounded-full bg-rose-500/5 flex items-center justify-center border border-rose-500/10 mx-auto">
            <Heart className="w-6 h-6 text-rose-500/75 fill-rose-500/5 animate-pulse" />
          </div>
          <div className="space-y-1.5 max-w-xs mx-auto">
            <h3 className="font-serif text-sm font-semibold text-foreground">
              Your wishlist is empty
            </h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Add your favorite premium press-on nail styles here to track them, review variations, and prepare your next order.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md group cursor-pointer"
          >
            Explore Catalog
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="transition-all duration-350 ease-in-out transform hover:-translate-y-0.5"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
