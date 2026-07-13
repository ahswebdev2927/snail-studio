"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, ShoppingBag, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { formatPrice } from "@/lib/utils";

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    shortDescription?: string | null;
    priceMin: number; // Stored in paise
    priceMax: number; // Stored in paise
    isBestSeller?: boolean;
    isNewArrival?: boolean;
    isTrending?: boolean;
    rating?: number;
    reviewCount?: number;
    reviewsCount?: number;
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
    brandName?: string | null;
    brand?: {
      name: string;
    } | null;
    attributes?: {
      groupCode: string;
      groupName: string;
      value: string;
      valueCode: string;
    }[];
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const cart = useCartStore((state) => state.cart);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const toggleWishlist = useCartStore((state) => state.toggleWishlist);
  const wishlist = useCartStore((state) => state.wishlist);
  const [isAdding, setIsAdding] = useState(false);

  const favorite = wishlist.includes(product.id);
  const cartItem = cart.find((item) => item.id === product.id || item.productId === product.id);
  const isInCart = !!cartItem;

  // Extract media items safely to handle different query patterns
  let images: string[] = [];
  if (product.media && Array.isArray(product.media)) {
    images = product.media
      .map((item: any) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          if (item.media && typeof item.media === "object" && item.media.url) {
            return item.media.url;
          }
          if (item.url) return item.url;
        }
        return "";
      })
      .filter((url) => !!url);
  } else if (product.images && Array.isArray(product.images)) {
    images = product.images
      .map((item: any) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && item.url) return item.url;
        return "";
      })
      .filter((url) => !!url);
  }

  // Fallbacks for mock data compatibility
  if (images.length === 0 && (product as any).image) {
    images = [(product as any).image];
  }
  if (images.length === 0 && (product as any).imageUrl) {
    images = [(product as any).imageUrl];
  }
  if (images.length === 0) {
    images = ["/luxury_nails_hero.png"];
  }

  const primaryImage = images[0];
  const secondaryImage = images[1] || images[0];

  // Normalise price to Rupees for local use-cart-store, which handles normalising
  const priceInRupees = product.priceMin / 100;
  const isRange = product.priceMin !== product.priceMax;

  // Local helper to format prices as whole integers (Flipkart style)
  const formatWholePrice = (paise: number) => {
    const rupees = Math.round(paise / 100);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(rupees);
  };

  // Format pricing for display
  const displayPrice = isRange
    ? `${formatWholePrice(product.priceMin)} - ${formatWholePrice(product.priceMax)}`
    : formatWholePrice(product.priceMin);

  // Flipkart style discount computations
  const compareAtPriceMin = (product as any).compareAtPriceMin ?? (product as any).compareAtPrice ?? (product as any).compareAtPriceMax;
  const rawCompareAtPrice = compareAtPriceMin || (product.priceMin * 1.25); // Deterministic fallback if compareAtPrice is missing
  const displayComparePrice = isRange
    ? `${formatWholePrice(rawCompareAtPrice)}`
    : formatWholePrice(rawCompareAtPrice);

  const discountPercent = Math.round(((rawCompareAtPrice - product.priceMin) / rawCompareAtPrice) * 100);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsAdding(true);
    addToCart({
      id: product.id,
      name: product.name,
      price: priceInRupees,
      imageUrl: primaryImage,
      variantName: "Standard Set",
    });
    setTimeout(() => setIsAdding(false), 800);
  };

  const reviewsCount = product.reviewsCount ?? product.reviewCount ?? 15 + (product.name.charCodeAt(product.name.length - 1) % 85);
  const ratingValue = product.rating ?? 4.2 + (product.name.charCodeAt(0) % 7) * 0.1;


  // Determine active badges based on flags (matching store theme)
  const activeBadges: { text: string; classes: string; icon?: React.ReactNode }[] = [];
  if (product.isBestSeller) {
    activeBadges.push({
      text: "Best Seller",
      classes: "bg-primary text-primary-foreground border-primary/20 dark:border-primary/30",
      icon: <Star className="w-2.5 h-2.5 fill-current" />
    });
  }
  if (product.isTrending) {
    activeBadges.push({
      text: "Trending",
      classes: "bg-accent/20 text-accent-foreground border-accent/30 dark:bg-accent/30 dark:text-accent dark:border-accent/40",
    });
  }
  if (product.isNewArrival) {
    activeBadges.push({
      text: "New Arrival",
      classes: "bg-foreground text-background border-foreground/10 dark:bg-foreground/10 dark:text-foreground dark:border-foreground/20",
    });
  }

  return (
    <div className="group flex flex-col bg-card rounded-xl overflow-hidden border border-border/25 hover:border-primary/30 hover:shadow-md transition-all duration-300 relative h-full justify-between">
      {/* Product Image Container */}
      <Link href={`/products/${product.slug}`} className="relative aspect-square w-full overflow-hidden block bg-white">
        {/* Main image */}
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className={`object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
            images.length > 1 ? "group-hover:opacity-0" : ""
          }`}
        />
        
        {/* Secondary image (hover crossfade) */}
        {images.length > 1 && (
          <Image
            src={secondaryImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
          />
        )}

        {/* Cart Icon (Top Left Corner, opposite of wishlist icon) */}
        {isInCart && (
          <div className="absolute top-3 left-3 p-1.5 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xs border border-border/20 shadow-xs text-primary z-20 animate-fade-in">
            <ShoppingBag className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Heart Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black backdrop-blur-xs border border-border/20 shadow-xs text-muted-foreground hover:text-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer z-20"
          aria-label="Toggle Wishlist"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-all duration-300 ${
              favorite ? "fill-rose-500 text-rose-500 scale-105" : ""
            }`}
          />
        </button>

        {/* Quantity adjust group overlay or Quick Buy button overlay */}
        {isInCart && cartItem ? (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-white text-[#3A2E2A] dark:bg-card dark:text-foreground border border-border/10 shadow-md rounded-sm h-[38px] z-30 select-none overflow-hidden animate-fade-in transition-all duration-300 md:opacity-0 md:translate-y-2 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (cartItem.quantity > 1) {
                  updateQuantity(cartItem.id, cartItem.quantity - 1);
                } else {
                  removeFromCart(cartItem.id);
                }
              }}
              className="w-1/3 h-full flex items-center justify-center text-[#5E514B] hover:bg-[#3A2E2A] hover:text-white dark:text-[#E4D8D1] dark:hover:bg-primary dark:hover:text-primary-foreground transition-all duration-200 cursor-pointer border-none bg-transparent"
              aria-label="Decrease Quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-1/3 h-full flex items-center justify-center border-x border-border/10 text-xs font-bold font-sans text-[#3A2E2A] dark:text-foreground">
              {cartItem.quantity}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateQuantity(cartItem.id, cartItem.quantity + 1);
              }}
              className="w-1/3 h-full flex items-center justify-center text-[#5E514B] hover:bg-[#3A2E2A] hover:text-white dark:text-[#E4D8D1] dark:hover:bg-primary dark:hover:text-primary-foreground transition-all duration-200 cursor-pointer border-none bg-transparent"
              aria-label="Increase Quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/products/${product.slug}`);
            }}
            className="absolute bottom-4 left-4 right-4 py-2.5 bg-white text-[#3A2E2A] hover:bg-[#3A2E2A] hover:text-white dark:bg-card dark:text-foreground dark:hover:bg-primary dark:hover:text-primary-foreground border border-border/10 shadow-md text-[10px] font-bold uppercase tracking-wider rounded-sm z-30 cursor-pointer text-center transition-all duration-300 md:opacity-0 md:translate-y-2 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto"
          >
            Quick Buy
          </button>
        )}
      </Link>

      {/* Product Details (Flipkart Style) */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          {/* Title */}
          <h3 className="font-serif text-sm sm:text-base text-foreground font-medium group-hover:text-primary transition-colors line-clamp-1">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>

          {/* Rating Badge */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
              <span>{ratingValue.toFixed(1)}</span>
              <Star className="w-2.5 h-2.5 fill-primary-foreground stroke-primary-foreground" />
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">
              ({reviewsCount})
            </span>
          </div>

          {/* Pricing & Discount */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 pt-1">
            <span className="text-sm sm:text-base font-bold text-foreground">
              {displayPrice}
            </span>
            {rawCompareAtPrice > product.priceMin && (
              <span className="text-xs text-muted-foreground line-through">
                {displayComparePrice}
              </span>
            )}
          </div>

          {/* Promotional Tags */}
          {activeBadges.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {activeBadges.map((badge) => (
                <span
                  key={badge.text}
                  className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded border ${badge.classes}`}
                >
                  {badge.icon}
                  {badge.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
