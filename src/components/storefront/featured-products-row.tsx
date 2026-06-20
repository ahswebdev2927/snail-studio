"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string;
  rating: number;
  reviewsCount: number;
  tags: string[];
}

interface FeaturedProductsRowProps {
  products: Product[];
}

export function FeaturedProductsRow({ products }: FeaturedProductsRowProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useCartStore((state) => state.toggleWishlist);
  const isInWishlist = useCartStore((state) => state.isInWishlist);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
      {products.map((product) => {
        const favorite = isInWishlist(product.id);
        return (
          <div
            key={product.id}
            className="group flex flex-col md:flex-row bg-card rounded-2xl overflow-hidden border border-border/30 hover:shadow-xl transition-all duration-300 relative"
          >
            <div className="relative w-full md:w-1/2 aspect-square">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 25vw"
                className="object-cover group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-background/90 text-primary backdrop-blur-xs rounded-full border border-border/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {/* Floating Wishlist Heart */}
              <button
                onClick={() => toggleWishlist(product.id)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-background/95 backdrop-blur-xs border border-border/20 shadow-sm text-muted-foreground hover:text-red-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                aria-label="Add to Wishlist"
              >
                <Heart className={`w-4.5 h-4.5 ${favorite ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>

            <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-accent">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-xs font-bold text-foreground">{product.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground">({product.reviewsCount} reviews)</span>
                </div>
                <h3 className="font-serif text-xl text-foreground font-medium group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed font-light">
                    {product.description}
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-border/30">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground font-light">Price</span>
                  <span className="font-serif text-2xl font-semibold text-primary">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                </div>
                <button
                  onClick={() =>
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      imageUrl: product.image,
                      variantName: product.tags[0] || "Standard Set",
                    })
                  }
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xs cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
