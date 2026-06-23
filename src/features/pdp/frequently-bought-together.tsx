"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Plus, ShoppingBag, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface VariantInfo {
  id: string;
  name: string;
  price: number;
  stockLevel: number;
}

interface FbtProduct {
  id: string;
  name: string;
  imageUrl?: string;
  variants: VariantInfo[];
}

interface FrequentlyBoughtTogetherProps {
  currentProduct: FbtProduct;
  recommendations: FbtProduct[];
}

export function FrequentlyBoughtTogether({
  currentProduct,
  recommendations,
}: FrequentlyBoughtTogetherProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const setCartOpen = useCartStore((s) => s.setCartOpen);

  const allProducts = useMemo(() => {
    return [currentProduct, ...recommendations];
  }, [currentProduct, recommendations]);

  // Track checked state per product ID
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>(() => {
    const initialChecked: Record<string, boolean> = { [currentProduct.id]: true };
    for (const rec of recommendations) {
      initialChecked[rec.id] = true; // Pre-checked by default for higher conversion
    }
    return initialChecked;
  });

  // Track selected variant ID per product ID
  const [selectedVariantIds, setSelectedVariantIds] = useState<Record<string, string>>(() => {
    const initialVariants: Record<string, string> = {};
    for (const p of allProducts) {
      const defaultVariant = p.variants.find((v) => v.stockLevel > 0) ?? p.variants[0];
      if (defaultVariant) {
        initialVariants[p.id] = defaultVariant.id;
      }
    }
    return initialVariants;
  });

  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Compute checked products & totals
  const checkedProducts = useMemo(() => {
    return allProducts.filter((p) => checkedIds[p.id]);
  }, [allProducts, checkedIds]);

  const { totalPrice, totalOriginalPrice } = useMemo(() => {
    let priceSum = 0;
    for (const p of checkedProducts) {
      const vId = selectedVariantIds[p.id];
      const variant = p.variants.find((v) => v.id === vId);
      if (variant) {
        priceSum += variant.price;
      }
    }
    return {
      totalPrice: priceSum,
      totalOriginalPrice: priceSum > 0 ? priceSum * 1.15 : 0, // Mock 15% discount for visual appeal/incentive
    };
  }, [checkedProducts, selectedVariantIds]);

  const handleToggleChecked = (productId: string) => {
    if (productId === currentProduct.id) return; // Main product cannot be deselected
    setCheckedIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedVariantIds((prev) => ({
      ...prev,
      [productId]: variantId,
    }));
  };

  const handleAddBundle = () => {
    if (checkedProducts.length === 0 || isAdding) return;
    setIsAdding(true);

    // Add each checked item to cart
    for (const p of checkedProducts) {
      const vId = selectedVariantIds[p.id];
      const variant = p.variants.find((v) => v.id === vId);
      if (variant) {
        addToCart(
          {
            id: variant.id,
            name: p.name,
            price: variant.price / 100,
            imageUrl: p.imageUrl,
            variantName: variant.name,
          },
          1
        );
      }
    }

    setTimeout(() => {
      setIsAdding(false);
      setJustAdded(true);
      setCartOpen(true);
      setTimeout(() => setJustAdded(false), 2200);
    }, 600);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 border-t border-border/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Title */}
        <div className="space-y-1.5 text-center md:text-left">
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            Bundle Offer
          </span>
          <h2 className="font-serif text-2xl font-normal text-foreground">
            Frequently Bought Together
          </h2>
          <p className="text-xs text-muted-foreground font-light">
            Bundle complementary accessories and styles to complete your luxury manicure setup.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[68fr_32fr] gap-8 p-6 md:p-8 rounded-3xl bg-secondary/15 border border-border/30 items-center">
          
          {/* Left: Bundle Items Display */}
          <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
            {allProducts.map((p, index) => {
              const isChecked = !!checkedIds[p.id];
              const isMain = p.id === currentProduct.id;
              const vId = selectedVariantIds[p.id];
              const activeVariant = p.variants.find((v) => v.id === vId);

              return (
                <React.Fragment key={p.id}>
                  {/* Plus Sign Connector */}
                  {index > 0 && (
                    <div className="text-muted-foreground/40 shrink-0">
                      <Plus className="w-5 h-5" />
                    </div>
                  )}

                  {/* Individual Item Card */}
                  <div
                    className={cn(
                      "flex flex-col items-center text-center gap-2 group transition-all duration-300 w-36 relative",
                      !isChecked && "opacity-40"
                    )}
                  >
                    {/* Checkbox selector */}
                    {!isMain && (
                      <button
                        onClick={() => handleToggleChecked(p.id)}
                        className={cn(
                          "absolute top-1 left-1 z-10 w-5 h-5 rounded-md border border-border flex items-center justify-center cursor-pointer transition-colors bg-card",
                          isChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "hover:border-primary/50"
                        )}
                        aria-label={isChecked ? `Remove ${p.name}` : `Add ${p.name}`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                      </button>
                    )}

                    {/* Image */}
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-card border border-border/40 relative shadow-sm transition-transform duration-300 group-hover:scale-105">
                      <Image
                        src={p.imageUrl || "/luxury_nails_hero.png"}
                        alt={p.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>

                    {/* Name & Pricing */}
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold text-foreground line-clamp-1 leading-tight">
                        {p.name}
                      </p>
                      <p className="text-[11px] font-medium text-primary">
                        {activeVariant ? formatPrice(activeVariant.price) : "—"}
                      </p>
                    </div>

                    {/* Variant Selector Dropdown */}
                    {p.variants.length > 1 && isChecked && (
                      <select
                        value={vId}
                        onChange={(e) => handleVariantChange(p.id, e.target.value)}
                        className="text-[9px] px-2 py-1 bg-card border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-[110px]"
                      >
                        {p.variants.map((v) => (
                          <option key={v.id} value={v.id} disabled={v.stockLevel <= 0}>
                            {v.name} {v.stockLevel <= 0 && "(OOS)"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Right: Summary Box */}
          <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Total Price ({checkedProducts.length} Items)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold text-primary">
                  {formatPrice(totalPrice)}
                </span>
                {totalOriginalPrice > totalPrice && (
                  <span className="font-serif text-sm text-muted-foreground line-through">
                    {formatPrice(totalOriginalPrice)}
                  </span>
                )}
              </div>
              {totalOriginalPrice > totalPrice && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                  Save 15% Bundle Discount
                </span>
              )}
            </div>

            <button
              onClick={handleAddBundle}
              disabled={checkedProducts.length === 0 || isAdding}
              className={cn(
                "w-full py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
                justAdded
                  ? "bg-emerald-500 text-white cursor-default"
                  : checkedProducts.length > 0
                  ? "bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] shadow-md shadow-primary/10"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isAdding ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : justAdded ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Bundle Added!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Add Bundle to Cart
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
