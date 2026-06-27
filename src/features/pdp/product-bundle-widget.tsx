"use client";

import React, { useState, useMemo } from "react";
import { Sparkles, Check, ShoppingBag, Info } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";

interface AttributeValue {
  id: string;
  code: string;
  value: string;
  group: {
    code: string;
    name: string;
  };
}

interface VariantAttribute {
  attributeValue: AttributeValue;
}

interface Variant {
  id: string;
  name: string;
  price: number; // in paise
  stockLevel: number;
  status: string;
  attributes: VariantAttribute[];
}

interface Media {
  id: string;
  url: string;
}

interface ProductMedia {
  isFeatured: boolean;
  media: Media;
}

interface ProductDetail {
  id: string;
  name: string;
  priceMin: number; // in paise
  priceMax: number; // in paise
  status: string;
  variants: Variant[];
  media: ProductMedia[];
}

interface BundleItemDetail {
  bundleId: string;
  productId: string;
  product: ProductDetail;
}

interface BundleDetail {
  id: string;
  name: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  items: BundleItemDetail[];
}

interface ProductBundleWidgetProps {
  bundles: BundleDetail[];
  currentProductId: string;
}

export function ProductBundleWidget({ bundles, currentProductId }: ProductBundleWidgetProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const setCartOpen = useCartStore((s) => s.setCartOpen);

  // Store user selection of attributes for each product in each bundle
  // Structure: Record<bundleId, Record<productId, Record<groupCode, valueCode>>>
  const [selections, setSelections] = useState<Record<string, Record<string, Record<string, string>>>>({});

  // Store which items are checked/included in each bundle
  // Structure: Record<bundleId, Record<productId, boolean>>
  const [checkedProducts, setCheckedProducts] = useState<Record<string, Record<string, boolean>>>(() => {
    const initialChecked: Record<string, Record<string, boolean>> = {};
    for (const b of bundles) {
      initialChecked[b.id] = {};
      for (const item of b.items) {
        initialChecked[b.id][item.productId] = true; // all checked by default
      }
    }
    return initialChecked;
  });

  // Calculate attribute groups for a product
  const getProductAttributeGroups = (product: ProductDetail) => {
    const groupMap = new Map<string, { code: string; name: string; values: { code: string; name: string }[] }>();

    for (const v of product.variants) {
      if (v.status !== "Active") continue;
      for (const attr of v.attributes) {
        const val = attr.attributeValue;
        if (!groupMap.has(val.group.code)) {
          groupMap.set(val.group.code, {
            code: val.group.code,
            name: val.group.name,
            values: [],
          });
        }
        const g = groupMap.get(val.group.code)!;
        if (!g.values.some((valObj) => valObj.code === val.code)) {
          g.values.push({ code: val.code, name: val.value });
        }
      }
    }
    return Array.from(groupMap.values());
  };

  // Get current selections for a product
  const getSelectedAttributes = (bundleId: string, productId: string, product: ProductDetail) => {
    const bundleSel = selections[bundleId] || {};
    const prodSel = bundleSel[productId];
    if (prodSel) return prodSel;

    // Default select first available attributes
    const defaultSel: Record<string, string> = {};
    const firstActiveVariant = product.variants.find((v) => v.status === "Active" && v.stockLevel > 0) || product.variants.find((v) => v.status === "Active");
    if (firstActiveVariant) {
      for (const attr of firstActiveVariant.attributes) {
        defaultSel[attr.attributeValue.group.code] = attr.attributeValue.code;
      }
    }
    return defaultSel;
  };

  // Handle attribute selection changes
  const handleSelectAttribute = (bundleId: string, productId: string, groupCode: string, valueCode: string) => {
    setSelections((prev) => {
      const bundleSel = prev[bundleId] || {};
      const prodSel = bundleSel[productId] || {};
      return {
        ...prev,
        [bundleId]: {
          ...bundleSel,
          [productId]: {
            ...prodSel,
            [groupCode]: valueCode,
          },
        },
      };
    });
  };

  // Match selections to a variant
  const resolveVariant = (product: ProductDetail, selectedAttrs: Record<string, string>) => {
    const attrGroups = getProductAttributeGroups(product);
    if (attrGroups.length === 0) {
      return product.variants.find((v) => v.status === "Active") || null;
    }
    return (
      product.variants.find(
        (v) =>
          v.status === "Active" &&
          attrGroups.every((g) =>
            v.attributes.some(
              (a) => a.attributeValue.group.code === g.code && a.attributeValue.code === selectedAttrs[g.code]
            )
          )
      ) || null
    );
  };

  // Handle checked toggling
  const handleToggleProduct = (bundleId: string, productId: string) => {
    setCheckedProducts((prev) => {
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

  // Handle adding bundle to cart
  const handleAddBundleToCart = (bundle: BundleDetail) => {
    const bundleChecked = checkedProducts[bundle.id] || {};
    const itemsToAdd = bundle.items.filter((item) => bundleChecked[item.productId]);

    let addedCount = 0;
    for (const item of itemsToAdd) {
      const prod = item.product;
      const selectedAttrs = getSelectedAttributes(bundle.id, prod.id, prod);
      const matchedVariant = resolveVariant(prod, selectedAttrs);

      if (!matchedVariant) continue;

      const primaryImage = prod.media.find((m) => m.isFeatured)?.media.url || prod.media[0]?.media.url || "";

      // Helper to retrieve user friendly labels for added metadata
      const getAttrLabel = (groupCode: string) => {
        const valueCode = selectedAttrs[groupCode];
        if (!valueCode) return undefined;
        const group = getProductAttributeGroups(prod).find((g) => g.code === groupCode);
        return group?.values.find((v) => v.code === valueCode)?.name;
      };

      addToCart(
        {
          id: matchedVariant.id,
          name: prod.name,
          price: matchedVariant.price / 100, // store in rupees
          imageUrl: primaryImage,
          variantName: matchedVariant.name,
          shape: getAttrLabel("shape"),
          length: getAttrLabel("length"),
          size: getAttrLabel("size"),
          productId: prod.id,
        },
        1
      );
      addedCount++;
    }

    if (addedCount > 0) {
      setCartOpen(true);
    }
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
    <div className="mt-16 pt-12 border-t border-border/20 space-y-8">
      <div>
        <span className="text-[10px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1.5 leading-none">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-primary fill-primary" /> Bundle & Save
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-normal text-foreground mt-1.5">
          Frequently Bought Together
        </h2>
        <p className="text-sm text-muted-foreground/80 mt-1 font-sans font-light">
          Buy these items together and get a special bundle discount!
        </p>
      </div>

      <div className="space-y-8">
        {bundles.map((bundle) => {
          const bundleChecked = checkedProducts[bundle.id] || {};
          
          // Calculate original subtotal for items that are checked
          let originalSubtotal = 0;
          let activeVariantsCount = 0;

          const checkedItems = bundle.items.filter((item) => bundleChecked[item.productId]);

          for (const item of checkedItems) {
            const prod = item.product;
            const selectedAttrs = getSelectedAttributes(bundle.id, prod.id, prod);
            const matchedVariant = resolveVariant(prod, selectedAttrs);
            if (matchedVariant) {
              originalSubtotal += matchedVariant.price;
              activeVariantsCount++;
            }
          }

          // Calculate Discount
          let discountVal = 0;
          if (bundle.discountType === "percentage") {
            discountVal = Math.round((originalSubtotal * bundle.discountValue) / 100);
          } else {
            // Fixed discount is only fully applicable if all bundle items are checked, otherwise scale it down proportionately
            const totalItemsCount = bundle.items.length;
            const checkedCount = checkedItems.length;
            discountVal = Math.round((bundle.discountValue * checkedCount) / totalItemsCount);
          }

          const discountedTotal = Math.max(0, originalSubtotal - discountVal);

          return (
            <div
              key={bundle.id}
              className="bg-secondary/35 border border-border/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden"
            >
              {/* Promotion Header Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/30 pb-4">
                <div>
                  <h3 className="font-sans font-semibold text-foreground text-base">
                    {bundle.name}
                  </h3>
                  {bundle.description && (
                    <p className="text-xs text-muted-foreground font-light mt-0.5 leading-relaxed">
                      {bundle.description}
                    </p>
                  )}
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide">
                  {bundle.discountType === "percentage" ? (
                    `Save ${bundle.discountValue}%`
                  ) : (
                    `Save ${formatPrice(bundle.discountValue)}`
                  )}
                </div>
              </div>

              {/* Bundle Products List */}
              <div className="space-y-4">
                {bundle.items.map((item) => {
                  const prod = item.product;
                  const isChecked = !!bundleChecked[prod.id];
                  const selectedAttrs = getSelectedAttributes(bundle.id, prod.id, prod);
                  const matchedVariant = resolveVariant(prod, selectedAttrs);
                  const attrGroups = getProductAttributeGroups(prod);

                  const image = prod.media.find((m) => m.isFeatured)?.media.url || prod.media[0]?.media.url || "";

                  return (
                    <div
                      key={prod.id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                        isChecked
                          ? "bg-card border-border/40 shadow-xs text-foreground"
                          : "border-transparent opacity-50 bg-secondary/10 text-muted-foreground"
                      }`}
                    >
                      {/* Left: Checkbox + Thumbnail + Name */}
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {/* Custom Checkbox */}
                        <div
                          onClick={() => handleToggleProduct(bundle.id, prod.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            isChecked
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border/30 bg-card hover:border-primary/50"
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                        </div>

                        {/* Thumbnail */}
                        {image && (
                          <img
                            src={image}
                            alt={prod.name}
                            className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-border/5 shrink-0"
                          />
                        )}

                        {/* Name and Selector Options */}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-foreground truncate leading-tight">
                            {prod.name}
                          </h4>
                          
                          {/* Option Dropdowns for Customizable Press-Ons */}
                          {isChecked && attrGroups.length > 0 && (
                            <div className="flex flex-wrap gap-3 mt-3">
                              {attrGroups.map((g) => (
                                <div key={g.code} className="flex items-center gap-2">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {g.name}:
                                  </span>
                                  <select
                                    value={selectedAttrs[g.code] || ""}
                                    onChange={(e) =>
                                      handleSelectAttribute(bundle.id, prod.id, g.code, e.target.value)
                                    }
                                    className="px-2.5 py-1 border border-border/60 rounded-lg text-[10px] font-medium bg-secondary/40 text-foreground outline-none focus:border-primary/50 transition-colors cursor-pointer"
                                  >
                                    {g.values.map((v) => (
                                      <option key={v.code} value={v.code}>
                                        {v.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          )}

                          {isChecked && matchedVariant && matchedVariant.stockLevel <= 0 && (
                            <p className="text-[10px] text-red-500 font-light mt-1 flex items-center gap-1">
                              <Info className="w-3 h-3" /> Out of stock in this combination
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Price */}
                      <div className="text-right sm:shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/5">
                        <span className="text-xs text-muted-foreground sm:hidden">Price:</span>
                        {matchedVariant ? (
                          <span className="font-mono text-sm font-medium text-foreground">
                            {formatPrice(matchedVariant.price)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unavailable</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bundle Summary & CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-5 border-t border-border/30">
                {/* Price Summary */}
                <div className="text-center sm:text-left space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs text-muted-foreground/80">Total Bundle Price:</span>
                    <span className="text-xs line-through text-muted-foreground/60 font-mono">
                      {formatPrice(originalSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-center sm:justify-start gap-2">
                    <span className="font-serif text-2xl font-normal text-foreground">
                      {formatPrice(discountedTotal)}
                    </span>
                    <span className="text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
                      Save {formatPrice(discountVal)}
                    </span>
                  </div>
                </div>

                {/* Add Button */}
                <button
                  onClick={() => handleAddBundleToCart(bundle)}
                  disabled={activeVariantsCount < 2 || originalSubtotal <= 0}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] font-semibold text-xs uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <ShoppingBag className="w-4 h-4" /> Add Bundle to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
