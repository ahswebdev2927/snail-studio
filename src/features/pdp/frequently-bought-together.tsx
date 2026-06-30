"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Plus, ShoppingBag, CheckCircle2 } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
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

interface BundleItemDetail {
  productId: string;
  product: FbtProduct;
}

interface BundleDetail {
  id: string;
  name: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  items: BundleItemDetail[];
}

interface FrequentlyBoughtTogetherProps {
  bundles: BundleDetail[];
  currentProductId: string;
}

export function FrequentlyBoughtTogether({
  bundles,
  currentProductId,
}: FrequentlyBoughtTogetherProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const setCartOpen = useCartStore((s) => s.setCartOpen);

  // selections structure: Record<bundleId, Record<productId, string (variantId)>>
  const [selectedVariantIds, setSelectedVariantIds] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    for (const b of bundles) {
      initial[b.id] = {};
      for (const item of b.items) {
        const prod = item.product;
        const firstActiveVariant = prod.variants.find((v) => v.stockLevel > 0) ?? prod.variants[0];
        if (firstActiveVariant) {
          initial[b.id][prod.id] = firstActiveVariant.id;
        }
      }
    }
    return initial;
  });

  // checkedIds structure: Record<bundleId, Record<productId, boolean>>
  const [checkedIds, setCheckedIds] = useState<Record<string, Record<string, boolean>>>(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    for (const b of bundles) {
      initial[b.id] = {};
      for (const item of b.items) {
        initial[b.id][item.productId] = true;
      }
    }
    return initial;
  });

  const [isAdding, setIsAdding] = useState<Record<string, boolean>>({});
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});

  const handleToggleChecked = (bundleId: string, productId: string) => {
    if (productId === currentProductId) return; // Main product cannot be deselected
    
    setCheckedIds((prev) => {
      const bundleChecked = prev[bundleId] || {};
      const currentCheckedCount = Object.values(bundleChecked).filter(Boolean).length;

      // Do not allow checking off if it goes below 2 items (a bundle must have at least 2 items)
      if (bundleChecked[productId] && currentCheckedCount <= 2) {
        return prev;
      }

      return {
        ...prev,
        [bundleId]: {
          ...bundleChecked,
          [productId]: !bundleChecked[productId],
        },
      };
    });
  };

  const handleVariantChange = (bundleId: string, productId: string, variantId: string) => {
    setSelectedVariantIds((prev) => ({
      ...prev,
      [bundleId]: {
        ...(prev[bundleId] || {}),
        [productId]: variantId,
      },
    }));
  };

  const getBundlePrices = (bundle: BundleDetail) => {
    const bundleChecked = checkedIds[bundle.id] || {};
    const bundleVariants = selectedVariantIds[bundle.id] || {};
    
    let originalSubtotal = 0;
    let checkedItemsCount = 0;

    const checkedItems = bundle.items.filter((item) => bundleChecked[item.productId]);

    for (const item of checkedItems) {
      const prod = item.product;
      const vId = bundleVariants[prod.id];
      const variant = prod.variants.find((v) => v.id === vId);
      if (variant) {
        originalSubtotal += variant.price;
        checkedItemsCount++;
      }
    }

    // Calculate Discount
    let discountVal = 0;
    if (bundle.discountType === "percentage") {
      discountVal = Math.round((originalSubtotal * bundle.discountValue) / 100);
    } else {
      // Fixed discount is scaled down proportionately if some items are unchecked
      const totalItemsCount = bundle.items.length;
      const checkedCount = checkedItems.length;
      discountVal = Math.round((bundle.discountValue * checkedCount) / totalItemsCount);
    }

    const discountedTotal = Math.max(0, originalSubtotal - discountVal);

    return {
      originalSubtotal,
      discountVal,
      discountedTotal,
      checkedItemsCount,
      checkedItems,
    };
  };

  const handleAddBundle = (bundle: BundleDetail) => {
    const { originalSubtotal, discountVal, checkedItems } = getBundlePrices(bundle);
    if (checkedItems.length === 0 || isAdding[bundle.id]) return;

    setIsAdding((prev) => ({ ...prev, [bundle.id]: true }));

    let addedCount = 0;

    for (const item of checkedItems) {
      const prod = item.product;
      const vId = selectedVariantIds[bundle.id]?.[prod.id];
      const variant = prod.variants.find((v) => v.id === vId);
      if (!variant) continue;

      let itemPrice = variant.price; // in paise
      
      if (bundle.discountType === "percentage") {
        itemPrice = Math.round(variant.price * (1 - bundle.discountValue / 100));
      } else {
        if (originalSubtotal > 0) {
          const itemDiscount = Math.round(discountVal * (variant.price / originalSubtotal));
          itemPrice = Math.max(0, variant.price - itemDiscount);
        }
      }

      // Convert paise to rupees for useCartStore
      const finalRupeesPrice = itemPrice / 100;
      const primaryImage = prod.imageUrl || "/luxury_nails_hero.png";

      addToCart(
        {
          id: variant.id,
          name: `${prod.name} (Bundle Offer)`,
          price: finalRupeesPrice,
          imageUrl: primaryImage,
          variantName: variant.name,
          productId: prod.id,
        },
        1
      );
      addedCount++;
    }

    setTimeout(() => {
      setIsAdding((prev) => ({ ...prev, [bundle.id]: false }));
      setJustAdded((prev) => ({ ...prev, [bundle.id]: true }));
      setCartOpen(true);
      setTimeout(() => {
        setJustAdded((prev) => ({ ...prev, [bundle.id]: false }));
      }, 2200);
    }, 600);
  };

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(paise / 100);
  };

  if (bundles.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 border-t border-border/30">
      <div className="max-w-4xl mx-auto space-y-16">
        {bundles.map((bundle) => {
          const prices = getBundlePrices(bundle);
          return (
            <div key={bundle.id} className="space-y-8">
              {/* Title Header */}
              <div className="space-y-1.5 text-center md:text-left">
                <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  Bundle Offer
                </span>
                <h2 className="font-serif text-2xl font-normal text-foreground">
                  {bundle.name}
                </h2>
                {bundle.description && (
                  <p className="text-xs text-muted-foreground font-light">
                    {bundle.description}
                  </p>
                )}
              </div>

              {/* Grid Box */}
              <div className="grid grid-cols-1 lg:grid-cols-[68fr_32fr] gap-8 p-6 md:p-8 rounded-3xl bg-secondary/15 border border-border/30 items-center">
                {/* Left: Products side-by-side */}
                <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
                  {bundle.items.map((item, index) => {
                    const p = item.product;
                    const isChecked = !!checkedIds[bundle.id]?.[p.id];
                    const isMain = p.id === currentProductId;
                    const vId = selectedVariantIds[bundle.id]?.[p.id];
                    const activeVariant = p.variants.find((v) => v.id === vId);
                    const pPrimaryImageUrl = p.imageUrl || "/luxury_nails_hero.png";

                    return (
                      <React.Fragment key={p.id}>
                        {/* Plus Connector */}
                        {index > 0 && (
                          <div className="text-muted-foreground/40 shrink-0">
                            <Plus className="w-5 h-5" />
                          </div>
                        )}

                        {/* Product Card */}
                        <div
                          className={cn(
                            "flex flex-col items-center text-center gap-2 group transition-all duration-300 w-36 relative",
                            !isChecked && "opacity-40"
                          )}
                        >
                          {/* Checkbox */}
                          {!isMain && (
                            <button
                              onClick={() => handleToggleChecked(bundle.id, p.id)}
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

                          {/* Thumbnail */}
                          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-card border border-border/40 relative shadow-sm transition-transform duration-300 group-hover:scale-105">
                            <Image
                              src={pPrimaryImageUrl}
                              alt={p.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>

                          {/* Title & Price */}
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-semibold text-foreground line-clamp-1 leading-tight">
                              {p.name}
                            </p>
                            <p className="text-[11px] font-medium text-primary">
                              {activeVariant ? formatPrice(activeVariant.price) : "—"}
                            </p>
                          </div>

                          {/* Dropdown Selection */}
                          {isChecked && p.variants.length > 1 && (
                            <select
                              value={vId}
                              onChange={(e) => handleVariantChange(bundle.id, p.id, e.target.value)}
                              className="text-[9px] px-2 py-1 bg-card border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full max-w-[110px] cursor-pointer"
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
                      Total Price ({prices.checkedItemsCount} Items)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-2xl font-bold text-primary">
                        {formatPrice(prices.discountedTotal)}
                      </span>
                      {prices.originalSubtotal > prices.discountedTotal && (
                        <span className="font-serif text-sm text-muted-foreground line-through">
                          {formatPrice(prices.originalSubtotal)}
                        </span>
                      )}
                    </div>
                    {prices.originalSubtotal > prices.discountedTotal && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                        Save {bundle.discountType === "percentage" ? `${bundle.discountValue}%` : formatPrice(bundle.discountValue)} Bundle Discount
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddBundle(bundle)}
                    disabled={prices.checkedItemsCount < 2 || isAdding[bundle.id]}
                    className={cn(
                      "w-full py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
                      justAdded[bundle.id]
                        ? "bg-emerald-500 text-white cursor-default"
                        : prices.checkedItemsCount >= 2
                        ? "bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] shadow-md shadow-primary/10"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {isAdding[bundle.id] ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : justAdded[bundle.id] ? (
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
          );
        })}
      </div>
    </div>
  );
}
