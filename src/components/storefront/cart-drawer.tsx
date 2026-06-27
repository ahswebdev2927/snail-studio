"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { Drawer, DrawerHeader, DrawerTitle, DrawerBody, DrawerFooter } from "../ui/drawer";
import { Button } from "../ui/button";
import { formatPrice, cn } from "@/lib/utils";
import { calculateBundleDiscount } from "@/lib/bundles";

export function CartDrawer() {
  const router = useRouter();
  const cartOpen = useCartStore((state) => state.cartOpen);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const cart = useCartStore((state) => state.cart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const addToCart = useCartStore((state) => state.addToCart);

  const [activeBundles, setActiveBundles] = useState<any[]>([]);

  useEffect(() => {
    if (cartOpen) {
      fetch("/api/bundles/active")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setActiveBundles(data);
          }
        })
        .catch((err) => console.error("Failed to load active bundles in cart drawer:", err));
    }
  }, [cartOpen]);

  // Calculate subtotal. If price is in paise, subtotal will be in paise.
  // Standard prices in DB are in paise (e.g. 299900 = ₹2,999.00).
  // Let's assume cart items store price in paise. If a price is less than 10000 (e.g. 2499), 
  // it might be in rupees. Let's normalise to paise for formatPrice.
  const getNormalizedPriceInPaise = (price: number) => {
    if (price < 10000) {
      return price * 100;
    }
    return price;
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + getNormalizedPriceInPaise(item.price) * item.quantity,
    0
  );

  const { totalDiscount: bundleDiscount } = calculateBundleDiscount(cart, activeBundles);

  // Free shipping progress calculations (Threshold: ₹3,000 / 300000 paise)
  const freeShippingThreshold = 300000;
  const remainingForFreeShipping = freeShippingThreshold - subtotal;
  const isFreeShipping = remainingForFreeShipping <= 0;
  const freeShippingProgress = Math.min((subtotal / freeShippingThreshold) * 100, 100);

  // Premium upgrades state
  const hasSizingKit = cart.some((item) => item.id === "accessory_sizing_kit");
  const hasGiftWrap = cart.some((item) => item.id === "accessory_gift_wrap");

  const handleToggleSizingKit = () => {
    if (hasSizingKit) {
      removeFromCart("accessory_sizing_kit");
    } else {
      addToCart({
        id: "accessory_sizing_kit",
        name: "Sizing Kit (All Shapes)",
        price: 150,
        imageUrl: "/luxury_nails_hero.png",
        variantName: "Accessory",
      });
    }
  };

  const handleToggleGiftWrap = () => {
    if (hasGiftWrap) {
      removeFromCart("accessory_gift_wrap");
    } else {
      addToCart({
        id: "accessory_gift_wrap",
        name: "Premium Gift Box & Prep Kit",
        price: 199,
        imageUrl: "/blush_marble_nails.png",
        variantName: "Accessory",
      });
    }
  };

  const handleCheckout = () => {
    setCartOpen(false);
    router.push("/checkout");
  };

  const handleShopNow = () => {
    setCartOpen(false);
    router.push("/shop");
  };

  return (
    <Drawer isOpen={cartOpen} onClose={() => setCartOpen(false)} side="right">
      {/* Header */}
      <DrawerHeader>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <DrawerTitle>
            Your Shopping Bag{" "}
            <span className="font-sans font-light text-muted-foreground text-sm">
              ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </span>
          </DrawerTitle>
        </div>
      </DrawerHeader>

      {/* Free Shipping Progress Indicator */}
      {cart.length > 0 && (
        <div className="px-6 py-4 bg-secondary/10 border-b border-border/10 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
            <span className="text-muted-foreground">
              {isFreeShipping ? "🎉 Free Shipping Unlocked!" : "Free Shipping Goal"}
            </span>
            <span className="text-primary">
              {isFreeShipping ? "Qualified" : `Spend ${formatPrice(remainingForFreeShipping)} more`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-secondary/60 border border-border/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/80 font-light text-center">
            {isFreeShipping
              ? "You have qualified for free standard shipping!"
              : `Add ${formatPrice(remainingForFreeShipping)} more to your bag to unlock free shipping.`}
          </p>
        </div>
      )}

      {/* Body */}
      <DrawerBody className="space-y-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-center space-y-6 px-4">
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground/60 border border-border/10">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-base text-foreground font-semibold">Your bag is empty</h4>
              <p className="text-xs text-muted-foreground font-light max-w-[250px] mx-auto leading-relaxed">
                Add some handcrafted premium nail sets to get started on your salon manicure.
              </p>
            </div>
            <Button onClick={handleShopNow} variant="default" size="sm" className="w-full max-w-[200px]">
              Shop Collections
            </Button>

            {/* Popular Collections Suggestions */}
            <div className="pt-6 border-t border-border/10 w-full max-w-[280px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Popular Collections
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/shop?shape=coffin"
                  onClick={() => setCartOpen(false)}
                  className="px-3 py-2 bg-secondary/35 border border-border/20 hover:border-primary/20 hover:bg-secondary/60 rounded-xl text-center text-xs font-medium text-foreground transition-all duration-200"
                >
                  Coffin Nails
                </Link>
                <Link
                  href="/shop?shape=almond"
                  onClick={() => setCartOpen(false)}
                  className="px-3 py-2 bg-secondary/35 border border-border/20 hover:border-primary/20 hover:bg-secondary/60 rounded-xl text-center text-xs font-medium text-foreground transition-all duration-200"
                >
                  Almond Nails
                </Link>
                <Link
                  href="/shop?category=nail-art"
                  onClick={() => setCartOpen(false)}
                  className="px-3 py-2 bg-secondary/35 border border-border/20 hover:border-primary/20 hover:bg-secondary/60 rounded-xl text-center text-xs font-medium text-foreground transition-all duration-200"
                >
                  Nail Art
                </Link>
                <Link
                  href="/shop"
                  onClick={() => setCartOpen(false)}
                  className="px-3 py-2 bg-secondary/35 border border-border/20 hover:border-primary/20 hover:bg-secondary/60 rounded-xl text-center text-xs font-medium text-foreground transition-all duration-200"
                >
                  All Styles
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="divide-y divide-border/10">
              {cart.map((item) => {
                const priceInPaise = getNormalizedPriceInPaise(item.price);
                const isAccessory = item.id.startsWith("accessory_");

                return (
                  <div key={item.id} className="py-4 flex gap-4 first:pt-0 last:pb-0">
                    {/* Image */}
                    <div className="w-20 h-20 bg-secondary/30 border border-border/40 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="font-serif text-sm font-semibold text-foreground line-clamp-1">
                          {item.name}
                        </h4>
                        {item.variantName && (
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
                            {item.variantName}
                          </span>
                        )}
                        {!isAccessory && (item.shape || item.length || item.size) && (
                          <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground/80 font-light">
                            {item.shape && <span>Shape: {item.shape}</span>}
                            {item.length && <span>Length: {item.length}</span>}
                            {item.size && <span>Size: {item.size}</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {/* Quantity Selector */}
                        {isAccessory ? (
                          <div className="text-[10px] text-muted-foreground font-light">
                            Quantity: 1
                          </div>
                        ) : (
                          <div className="flex items-center bg-secondary/45 border border-border/20 rounded-full p-0.5">
                            <button
                              onClick={() => {
                                if (item.quantity === 1) {
                                  removeFromCart(item.id);
                                } else {
                                  updateQuantity(item.id, item.quantity - 1);
                                }
                              }}
                              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-background hover:text-foreground text-muted-foreground transition-all cursor-pointer"
                              aria-label={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="w-2.5 h-2.5 text-destructive/70" />
                              ) : (
                                <Minus className="w-2.5 h-2.5" />
                              )}
                            </button>
                            <span className="px-2 text-xs font-semibold text-foreground min-w-[16px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-background hover:text-foreground text-muted-foreground transition-all cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}

                        {/* Price & Remove */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-serif font-semibold text-foreground">
                            {formatPrice(priceInPaise * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 rounded-full transition-colors cursor-pointer"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Premium Add-ons Section */}
            <div className="pt-5 border-t border-border/10 space-y-3">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Enhance Your Manicure
              </h5>
              <div className="space-y-2">
                {/* Sizing Kit */}
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                    hasSizingKit
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/20 bg-secondary/15 hover:border-border/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs">📏</span>
                    </div>
                    <div>
                      <h6 className="text-xs font-semibold text-foreground">Sizing Kit (All Shapes)</h6>
                      <p className="text-[9px] text-muted-foreground font-light leading-none mt-0.5">
                        Ensure a flawless custom fit
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground">₹150</span>
                    <input
                      type="checkbox"
                      checked={hasSizingKit}
                      onChange={handleToggleSizingKit}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                {/* Gift Wrap */}
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                    hasGiftWrap
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/20 bg-secondary/15 hover:border-border/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs">🎁</span>
                    </div>
                    <div>
                      <h6 className="text-xs font-semibold text-foreground">Premium Gift Box & Prep Kit</h6>
                      <p className="text-[9px] text-muted-foreground font-light leading-none mt-0.5">
                        Elegant box, glue, buffer & tools
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground">₹199</span>
                    <input
                      type="checkbox"
                      checked={hasGiftWrap}
                      onChange={handleToggleGiftWrap}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DrawerBody>

      {/* Footer */}
      {cart.length > 0 && (
        <DrawerFooter className="space-y-4">
          {/* Coupon Highlight */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 flex items-center gap-2">
            <span className="text-xs shrink-0">💡</span>
            <p className="text-[10px] text-foreground font-light leading-relaxed">
              Use code <span className="font-semibold text-primary tracking-wider">SNAILGLAM</span> at checkout to get <span className="font-semibold text-primary">10% OFF</span>!
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Estimated Shipping</span>
              <span className="text-foreground font-medium">{isFreeShipping ? "FREE" : "Calculated at checkout"}</span>
            </div>
            {bundleDiscount > 0 && (
              <div className="flex justify-between items-center text-xs text-emerald-600 font-medium">
                <span>Bundle Discount</span>
                <span>-{formatPrice(bundleDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-semibold border-t border-border/10 pt-2 text-foreground">
              <span>Subtotal</span>
              <span className="text-primary font-serif">{formatPrice(subtotal - bundleDiscount)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleCheckout} className="w-full py-6 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 group">
              Proceed to Checkout
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              onClick={() => {
                setCartOpen(false);
                router.push("/cart");
              }}
              variant="outline"
              className="w-full py-5 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 border-border/40 hover:bg-secondary/50"
            >
              View Shopping Bag
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-2 pt-3 text-center text-muted-foreground border-t border-border/10 mt-1">
            <div className="flex flex-col items-center">
              <span className="text-[13px]">💅</span>
              <span className="text-[8px] font-semibold mt-1 uppercase tracking-wider text-muted-foreground/80 leading-none">Handcrafted</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[13px]">🔄</span>
              <span className="text-[8px] font-semibold mt-1 uppercase tracking-wider text-muted-foreground/80 leading-none">Reusable</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[13px]">🛡️</span>
              <span className="text-[8px] font-semibold mt-1 uppercase tracking-wider text-muted-foreground/80 leading-none">Secure Pay</span>
            </div>
          </div>
        </DrawerFooter>
      )}
    </Drawer>
  );
}
