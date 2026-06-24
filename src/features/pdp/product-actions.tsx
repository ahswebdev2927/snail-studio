"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Zap,
  Heart,
  Share2,
  Minus,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Sparkles,
  Layers,
  Shield,
  MapPin,
  Truck,
  Calendar,
} from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { syncWishlistDb } from "./actions";

/* -----------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------- */
export interface VariantAttribute {
  groupCode: string;   // e.g. "length"
  groupName: string;   // e.g. "Length"
  valueCode: string;   // e.g. "short"
  valueName: string;   // e.g. "Short"
  valueId: string;
}

export interface ProductVariantFull {
  id: string;
  sku: string;
  name: string;
  price: number;                  // paise
  compareAtPrice?: number | null; // paise
  status: "Active" | "Disabled" | "Archived";
  stockLevel: number;
  lowStockThreshold: number;
  attributes: VariantAttribute[];
}

export interface ProductActionsProps {
  productId: string;
  productName: string;
  productImageUrl?: string;
  variants: ProductVariantFull[];
}

/* -----------------------------------------------------------------------
 * Display order for attribute groups
 * --------------------------------------------------------------------- */
const GROUP_ORDER: Record<string, number> = {
  length:  0,
  shape:   1,
  size:    2,
  colour:  3,
  color:   3,
  texture: 4,
  style:   5,
};

/* -----------------------------------------------------------------------
 * Availability Badge (internal)
 * --------------------------------------------------------------------- */
function AvailabilityBadge({
  stockLevel,
  threshold,
}: {
  stockLevel: number;
  threshold: number;
}) {
  if (stockLevel <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
        <XCircle className="w-3.5 h-3.5" />
        Out of Stock
      </span>
    );
  }
  if (stockLevel <= threshold) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5" />
        Only {stockLevel} left!
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="w-3.5 h-3.5" />
      In Stock
    </span>
  );
}

/* -----------------------------------------------------------------------
 * Trust Badges (internal)
 * --------------------------------------------------------------------- */
function TrustBadges() {
  const badges = [
    { icon: Sparkles, title: "Handcrafted Art",  desc: "Designed by salon professionals" },
    { icon: Layers,   title: "Multi-Use",         desc: "Reapply up to 5× with glue tabs" },
    { icon: Shield,   title: "Secure Fit",        desc: "Cuticle wand & prep pad included" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {badges.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border/30"
        >
          <div className="p-2 rounded-full bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">{title}</p>
            <p className="text-[9px] text-muted-foreground font-light leading-snug mt-0.5">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Main ProductActions Component
 * --------------------------------------------------------------------- */
export function ProductActions({
  productId,
  productName,
  productImageUrl,
  variants,
}: ProductActionsProps) {
  const router = useRouter();
  const addToCart    = useCartStore((s) => s.addToCart);
  const setCartOpen  = useCartStore((s) => s.setCartOpen);
  const toggleWishlist = useCartStore((s) => s.toggleWishlist);
  const wishlist       = useCartStore((s) => s.wishlist);
  const favorite = wishlist.includes(productId);

  /* ----- Sync Wishlist with Database on Mount if Logged In ----- */
  useEffect(() => {
    async function performSync() {
      const localWishlist = useCartStore.getState().wishlist;
      const res = await syncWishlistDb(localWishlist);
      if (res.success && res.wishlist) {
        useCartStore.setState({ wishlist: res.wishlist });
        localStorage.setItem("snail_wishlist", JSON.stringify(res.wishlist));
      }
    }
    const timer = setTimeout(performSync, 200);
    return () => clearTimeout(timer);
  }, [productId]);

  /* ----- Build attribute groups from all variants ----- */
  const attributeGroups = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        code: string;
        name: string;
        order: number;
        values: Map<string, { code: string; name: string; id: string }>;
      }
    >();

    for (const v of variants) {
      for (const attr of v.attributes) {
        if (!groupMap.has(attr.groupCode)) {
          groupMap.set(attr.groupCode, {
            code: attr.groupCode,
            name: attr.groupName,
            order: GROUP_ORDER[attr.groupCode] ?? 99,
            values: new Map(),
          });
        }
        const g = groupMap.get(attr.groupCode)!;
        if (!g.values.has(attr.valueCode)) {
          g.values.set(attr.valueCode, {
            code: attr.valueCode,
            name: attr.valueName,
            id:   attr.valueId,
          });
        }
      }
    }

    return [...groupMap.values()]
      .sort((a, b) => a.order - b.order)
      .map((g) => ({ ...g, values: [...g.values.values()] }));
  }, [variants]);

  const isSimpleProduct = attributeGroups.length === 0;

  /* ----- Initial selection: pick the first in-stock Active variant ----- */
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(() => {
    const defaultVariant =
      variants.find((v) => v.status === "Active" && v.stockLevel > 0) ??
      variants.find((v) => v.status === "Active");
    if (!defaultVariant?.attributes.length) return {};
    return Object.fromEntries(
      defaultVariant.attributes.map((a) => [a.groupCode, a.valueCode])
    );
  });

  const [quantity,    setQuantity]    = useState(1);
  const [isAdding,    setIsAdding]    = useState(false);
  const [justAdded,   setJustAdded]   = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [copied,      setCopied]      = useState(false);

  /* ----- Resolve selected variant from chosen attribute combination ----- */
  const selectedVariant = useMemo(() => {
    if (isSimpleProduct) {
      return variants.find((v) => v.status !== "Archived") ?? null;
    }
    const groupCodes = attributeGroups.map((g) => g.code);
    if (groupCodes.some((g) => !selectedAttributes[g])) return null;
    return (
      variants.find(
        (v) =>
          v.status !== "Archived" &&
          groupCodes.every((g) =>
            v.attributes.some(
              (a) => a.groupCode === g && a.valueCode === selectedAttributes[g]
            )
          )
      ) ?? null
    );
  }, [variants, selectedAttributes, attributeGroups, isSimpleProduct]);

  /* ----- Clamp quantity when variant changes ----- */
  useEffect(() => {
    if (!selectedVariant) return;
    const max = selectedVariant.stockLevel;
    setQuantity((prev) => (max > 0 ? Math.min(prev, max) : 1));
  }, [selectedVariant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----- Check if a value has any matching Active variant given other selections ----- */
  const isValueAvailable = useCallback(
    (groupCode: string, valueCode: string): boolean => {
      const otherSels = Object.entries(selectedAttributes).filter(([g]) => g !== groupCode);
      return variants.some((v) => {
        if (v.status === "Archived") return false;
        if (!v.attributes.some((a) => a.groupCode === groupCode && a.valueCode === valueCode))
          return false;
        return otherSels.every(([g, vc]) =>
          v.attributes.some((a) => a.groupCode === g && a.valueCode === vc)
        );
      });
    },
    [variants, selectedAttributes]
  );

  /* ----- Check if a value has stock (Active + stockLevel > 0) ----- */
  const isValueInStock = useCallback(
    (groupCode: string, valueCode: string): boolean => {
      const otherSels = Object.entries(selectedAttributes).filter(([g]) => g !== groupCode);
      return variants.some((v) => {
        if (v.status !== "Active" || v.stockLevel <= 0) return false;
        if (!v.attributes.some((a) => a.groupCode === groupCode && a.valueCode === valueCode))
          return false;
        return otherSels.every(([g, vc]) =>
          v.attributes.some((a) => a.groupCode === g && a.valueCode === vc)
        );
      });
    },
    [variants, selectedAttributes]
  );

  /* ----- Handle chip click — select attribute, invalidate stale other selections ----- */
  const handleSelectAttribute = useCallback(
    (groupCode: string, valueCode: string) => {
      setSelectedAttributes((prev) => {
        const next = { ...prev, [groupCode]: valueCode };
        // If any other selection no longer has a valid combination, clear it
        for (const [gCode, gVal] of Object.entries(next)) {
          if (gCode === groupCode) continue;
          const otherSels = Object.entries(next).filter(([g]) => g !== gCode);
          const stillValid = variants.some((v) => {
            if (v.status === "Archived") return false;
            if (!v.attributes.some((a) => a.groupCode === gCode && a.valueCode === gVal))
              return false;
            return otherSels.every(([g, vc]) =>
              v.attributes.some((a) => a.groupCode === g && a.valueCode === vc)
            );
          });
          if (!stillValid) delete next[gCode];
        }
        return next;
      });
      setQuantity(1);
    },
    [variants]
  );

  /* ----- Derived states ----- */
  const allGroupsSelected =
    isSimpleProduct || attributeGroups.every((g) => !!selectedAttributes[g.code]);
  const maxStock    = selectedVariant?.stockLevel ?? 0;
  const isOutOfStock =
    !selectedVariant || selectedVariant.status !== "Active" || maxStock <= 0;
  const isLowStock  = !isOutOfStock && maxStock <= (selectedVariant?.lowStockThreshold ?? 5);
  const canAddToCart = allGroupsSelected && !isOutOfStock && !isAdding;

  /* ----- Dynamic price display ----- */
  const { displayPrice, originalPrice, discountPct } = useMemo(() => {
    if (selectedVariant) {
      const orig =
        selectedVariant.compareAtPrice &&
        selectedVariant.compareAtPrice > selectedVariant.price
          ? selectedVariant.compareAtPrice
          : null;
      const pct = orig
        ? Math.round(((orig - selectedVariant.price) / orig) * 100)
        : null;
      return {
        displayPrice:  formatPrice(selectedVariant.price),
        originalPrice: orig,
        discountPct:   pct,
      };
    }
    // Range across all non-archived variants
    const prices = variants
      .filter((v) => v.status !== "Archived")
      .map((v) => v.price);
    if (!prices.length)
      return { displayPrice: "—", originalPrice: null, discountPct: null };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return {
      displayPrice:
        min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`,
      originalPrice: null,
      discountPct:   null,
    };
  }, [selectedVariant, variants]);

  const displaySku =
    selectedVariant?.sku ?? variants.find((v) => v.status !== "Archived")?.sku ?? "—";

  /* ----- Groups not yet selected (for button hint) ----- */
  const unselectedGroups = attributeGroups.filter((g) => !selectedAttributes[g.code]);
  const selectionHint =
    unselectedGroups.length > 0
      ? `Select ${unselectedGroups.map((g) => g.name).join(" & ")}`
      : null;

  /* ----- Add to Cart ----- */
  const handleAddToCart = () => {
    if (!canAddToCart || !selectedVariant) return;
    setIsAdding(true);

    const getAttributeLabel = (groupCode: string) => {
      const valueCode = selectedAttributes[groupCode];
      if (!valueCode) return undefined;
      const group = attributeGroups.find((g) => g.code === groupCode);
      return group?.values.find((v) => v.code === valueCode)?.name;
    };

    addToCart(
      {
        id:          selectedVariant.id,
        name:        productName,
        price:       selectedVariant.price / 100,
        imageUrl:    productImageUrl,
        variantName: selectedVariant.name,
        shape:       getAttributeLabel("shape"),
        length:      getAttributeLabel("length"),
        size:        getAttributeLabel("size"),
      },
      quantity
    );
    setTimeout(() => {
      setIsAdding(false);
      setJustAdded(true);
      setCartOpen(true);
      setTimeout(() => setJustAdded(false), 2200);
    }, 500);
  };

  /* ----- Buy Now ----- */
  const handleBuyNow = () => {
    if (!canAddToCart || !selectedVariant || isBuyingNow) return;
    setIsBuyingNow(true);

    const getAttributeLabel = (groupCode: string) => {
      const valueCode = selectedAttributes[groupCode];
      if (!valueCode) return undefined;
      const group = attributeGroups.find((g) => g.code === groupCode);
      return group?.values.find((v) => v.code === valueCode)?.name;
    };

    addToCart(
      {
        id:          selectedVariant.id,
        name:        productName,
        price:       selectedVariant.price / 100,
        imageUrl:    productImageUrl,
        variantName: selectedVariant.name,
        shape:       getAttributeLabel("shape"),
        length:      getAttributeLabel("length"),
        size:        getAttributeLabel("size"),
      },
      quantity
    );
    router.push("/checkout");
  };

  /* ----- Share ----- */
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url });
      } catch (_) {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ----- Wishlist Toggle ----- */
  const handleWishlistToggle = () => {
    toggleWishlist(productId);
  };

  /* ----- No variants fallback ----- */
  if (!variants.length) {
    return (
      <div className="p-5 bg-secondary/40 rounded-2xl border border-border/30 text-center">
        <p className="text-sm text-muted-foreground font-light">
          This product is temporarily unavailable.
        </p>
      </div>
    );
  }

  /* -------------------------------------------------------------------
   * Render
   * ----------------------------------------------------------------- */
  return (
    <div className="flex flex-col gap-5">
      {/* ---- Price ---- */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Price
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-serif text-3xl font-medium text-primary">
            {displayPrice}
          </span>
          {originalPrice && (
            <span className="font-serif text-xl text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
          {discountPct && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {discountPct}% Off
            </span>
          )}
        </div>
      </div>

      {/* ---- Availability + SKU ---- */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {allGroupsSelected ? (
          <AvailabilityBadge
            stockLevel={isOutOfStock ? 0 : maxStock}
            threshold={selectedVariant?.lowStockThreshold ?? 5}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-secondary text-muted-foreground border border-border">
            Select options to check availability
          </span>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Package className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono">
            SKU:{" "}
            <span className="text-foreground font-semibold">{displaySku}</span>
          </span>
        </div>
      </div>

      <div className="border-t border-border/30" />

      {/* ---- SF-5.3: Variant Attribute Selectors ---- */}
      {!isSimpleProduct && (
        <div className="space-y-5">
          {attributeGroups.map((group) => {
            const selectedValue = selectedAttributes[group.code];
            const selectedLabel = group.values.find((v) => v.code === selectedValue)?.name;

            return (
              <div key={group.code} className="space-y-3">
                {/* Group label + selected value */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {group.name}
                  </span>
                  {selectedLabel && (
                    <>
                      <span className="text-border/60 text-[11px]">·</span>
                      <span className="text-[11px] font-medium text-primary">
                        {selectedLabel}
                      </span>
                    </>
                  )}
                </div>

                {/* Value chips */}
                <div className="flex flex-wrap gap-2">
                  {group.values.map((value) => {
                    const isSelected  = selectedValue === value.code;
                    const available   = isValueAvailable(group.code, value.code);
                    const inStock     = isValueInStock(group.code, value.code);

                    return (
                      <button
                        key={value.code}
                        type="button"
                        onClick={() =>
                          available && handleSelectAttribute(group.code, value.code)
                        }
                        disabled={!available}
                        aria-pressed={isSelected}
                        aria-label={`${group.name}: ${value.name}${
                          !inStock && available ? " (out of stock)" : ""
                        }${!available ? " (unavailable)" : ""}`}
                        className={cn(
                          "relative px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 select-none",
                          // Selected
                          isSelected &&
                            "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20 scale-[1.02]",
                          // Available + in stock (not selected)
                          !isSelected &&
                            available &&
                            inStock &&
                            "bg-card text-foreground border-border hover:border-primary/60 hover:text-primary cursor-pointer",
                          // Available but out of stock (not selected)
                          !isSelected &&
                            available &&
                            !inStock &&
                            "bg-card text-muted-foreground border-border/40 hover:border-primary/40 cursor-pointer",
                          // Unavailable (not in any valid combination)
                          !available &&
                            "bg-secondary/30 text-muted-foreground/40 border-border/20 cursor-not-allowed"
                        )}
                      >
                        {value.name}

                        {/* Diagonal strikethrough for out-of-stock-but-available chips */}
                        {available && !inStock && !isSelected && (
                          <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                            <svg
                              className="absolute inset-0 w-full h-full"
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                            >
                              <line
                                x1="4"
                                y1="96"
                                x2="96"
                                y2="4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="text-border"
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                          </span>
                        )}
                        {/* Lighter cross for completely unavailable combinations */}
                        {!available && (
                          <span className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                            <svg
                              className="absolute inset-0 w-full h-full"
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                            >
                              <line
                                x1="4"
                                y1="96"
                                x2="96"
                                y2="4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="text-border/40"
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- SF-5.4: Quantity Selector ---- */}
      {allGroupsSelected && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              Quantity
            </label>
            {isLowStock && selectedVariant && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Only {maxStock} remaining
              </span>
            )}
          </div>
          <div className="flex items-center">
            {/* Decrement */}
            <button
              type="button"
              id="pdp-qty-dec"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || isOutOfStock}
              aria-label="Decrease quantity"
              className="w-11 h-11 flex items-center justify-center rounded-l-xl border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Display */}
            <div
              className="w-16 h-11 flex items-center justify-center border-y border-border bg-card text-sm font-semibold tabular-nums"
              aria-live="polite"
              aria-label={`Quantity: ${isOutOfStock ? 0 : quantity}`}
            >
              {isOutOfStock ? 0 : quantity}
            </div>

            {/* Increment */}
            <button
              type="button"
              id="pdp-qty-inc"
              onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
              disabled={quantity >= maxStock || isOutOfStock}
              aria-label="Increase quantity"
              className="w-11 h-11 flex items-center justify-center rounded-r-xl border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ---- SF-5.5 / SF-5.6: CTA Buttons ---- */}
      <div className="flex flex-col gap-3">
        {/* Add to Cart */}
        <button
          type="button"
          id="pdp-add-to-cart"
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          aria-label={
            selectionHint
              ? selectionHint
              : isOutOfStock
              ? "Out of stock"
              : isAdding
              ? "Adding to cart"
              : justAdded
              ? "Added to cart"
              : "Add to cart"
          }
          className={cn(
            "w-full py-4 rounded-full text-sm font-semibold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
            justAdded
              ? "bg-emerald-500 text-white cursor-default"
              : canAddToCart
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] cursor-pointer"
              : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
          )}
        >
          {isAdding ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Adding…
            </>
          ) : justAdded ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Added to Cart!
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              {selectionHint ?? (isOutOfStock ? "Out of Stock" : "Add to Cart")}
            </>
          )}
        </button>

        {/* Buy Now */}
        <button
          type="button"
          id="pdp-buy-now"
          onClick={handleBuyNow}
          disabled={!canAddToCart || isBuyingNow}
          aria-label="Buy now — proceed directly to checkout"
          className={cn(
            "w-full py-4 rounded-full text-sm font-semibold uppercase tracking-widest border transition-all duration-300 flex items-center justify-center gap-2",
            canAddToCart && !isBuyingNow
              ? "bg-transparent text-foreground border-foreground/30 hover:bg-foreground hover:text-background hover:border-transparent active:scale-[0.98] cursor-pointer"
              : "bg-transparent text-muted-foreground border-border cursor-not-allowed"
          )}
        >
          {isBuyingNow ? (
            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {isBuyingNow ? "Redirecting…" : "Buy Now"}
        </button>

        {/* Wishlist + Share row */}
        <div className="flex gap-3">
          <button
            type="button"
            id="pdp-wishlist"
            onClick={handleWishlistToggle}
            aria-label={favorite ? "Remove from wishlist" : "Add to wishlist"}
            className={cn(
              "flex-1 py-3 rounded-full text-sm font-semibold uppercase tracking-wider border transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer",
              favorite
                ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-300/50"
                : "bg-transparent text-foreground border-border hover:border-primary/50 hover:text-primary"
            )}
          >
            <Heart
              className={cn("w-4 h-4 transition-all", favorite && "fill-current")}
            />
            {favorite ? "Wishlisted" : "Wishlist"}
          </button>

          <button
            type="button"
            id="pdp-share"
            onClick={handleShare}
            aria-label="Share this product"
            className="flex-1 py-3 rounded-full text-sm font-semibold uppercase tracking-wider border border-border hover:border-primary/50 hover:text-primary text-foreground transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>

      <div className="border-t border-border/30" />

      {/* SF-5.8: Delivery Estimator */}
      <DeliveryEstimator />

      <div className="border-t border-border/30" />

      {/* Trust Badges */}
      <TrustBadges />
    </div>
  );
}

/* -----------------------------------------------------------------------
 * Pincode Delivery Estimator (internal client component)
 * --------------------------------------------------------------------- */
function DeliveryEstimator() {
  const [pincode, setPincode] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{
    pincode: string;
    days: string;
    dateStr: string;
    type: "metro" | "standard" | "other";
    cod: boolean;
  } | null>(null);
  const [error, setError] = useState("");

  // Load saved pincode on mount
  useEffect(() => {
    const saved = localStorage.getItem("snail_pincode");
    const savedResult = localStorage.getItem("snail_pincode_result");
    if (saved && savedResult) {
      setPincode(saved);
      try {
        setResult(JSON.parse(savedResult));
      } catch (_) {}
    }
  }, []);

  const handleCheck = () => {
    setError("");
    if (!/^\d{6}$/.test(pincode)) {
      setError("Please enter a valid 6-digit PIN code.");
      setResult(null);
      return;
    }

    setIsChecking(true);

    // Simulate 600ms network check latency for interactive feel
    setTimeout(() => {
      const startsWith = pincode.substring(0, 2);
      let days = "4–5 business days";
      let deliveryType: "metro" | "standard" | "other" = "standard";
      let codAvailable = true;

      // Metro prefixes: 11 Delhi, 40 Mumbai, 56 Bangalore, 60 Chennai, 70 Kolkata
      if (["11", "40", "56", "60", "70"].includes(startsWith)) {
        days = "2–3 business days (Express)";
        deliveryType = "metro";
      } else if (["12", "13", "18", "19", "79", "80", "81", "82", "83", "84", "85", "90"].includes(startsWith)) {
        days = "5–7 business days";
        deliveryType = "other";
        // Remote locations COD check
        if (["19", "84", "90"].includes(startsWith)) {
          codAvailable = false;
        }
      }

      const today = new Date();
      const minDays = deliveryType === "metro" ? 2 : deliveryType === "other" ? 5 : 4;
      const maxDays = deliveryType === "metro" ? 3 : deliveryType === "other" ? 7 : 5;

      const addDays = (date: Date, daysCount: number) => {
        const resDate = new Date(date);
        resDate.setDate(resDate.getDate() + daysCount);
        return resDate;
      };

      const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
      const minDate = addDays(today, minDays);
      const maxDate = addDays(today, maxDays);
      const dateStr = `${minDate.toLocaleDateString("en-IN", options)} – ${maxDate.toLocaleDateString("en-IN", options)}`;

      const checkResult = {
        pincode,
        days,
        dateStr,
        type: deliveryType,
        cod: codAvailable,
      };

      setResult(checkResult);
      localStorage.setItem("snail_pincode", pincode);
      localStorage.setItem("snail_pincode_result", JSON.stringify(checkResult));
      setIsChecking(false);
    }, 600);
  };

  const handleClear = () => {
    setPincode("");
    setResult(null);
    localStorage.removeItem("snail_pincode");
    localStorage.removeItem("snail_pincode_result");
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-secondary/30 border border-border/30">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          Delivery & Services
        </span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-grow">
          <input
            type="text"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder="Enter 6-digit Pincode"
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60 transition-all font-mono tracking-wider"
          />
          {result && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-sans"
            >
              Clear
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking || pincode.length !== 6}
          className="px-4 py-2 bg-foreground text-background dark:bg-card dark:text-foreground dark:border dark:border-border hover:bg-foreground/90 rounded-xl text-xs font-semibold tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase shrink-0"
        >
          {isChecking ? "Checking..." : "Check"}
        </button>
      </div>

      {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}

      {result && !isChecking && (
        <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2.5">
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                Estimated Delivery by {result.dateStr}
              </p>
              <p className="text-[10px] text-muted-foreground font-light">
                Standard Courier Shipping ({result.days})
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
              ₹
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {result.cod ? "Cash on Delivery Available" : "Prepaid Payment Only"}
              </p>
              <p className="text-[10px] text-muted-foreground font-light">
                {result.cod
                  ? "Pay in cash or UPI at the time of delivery"
                  : "COD is currently unavailable for this PIN code"}
              </p>
            </div>
          </div>

          <div className="border-t border-border/10 pt-2 flex items-center justify-between text-[10px] text-muted-foreground font-light">
            <span>Free Shipping above ₹999</span>
            <span>Easy Exchange on Damage</span>
          </div>
        </div>
      )}
    </div>
  );
}
