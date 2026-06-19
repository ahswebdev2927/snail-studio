"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import { useCartStore, CartItem } from "@/lib/hooks/use-cart-store";
import { Drawer, DrawerHeader, DrawerTitle, DrawerBody, DrawerFooter } from "../ui/drawer";
import { Button } from "../ui/button";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const router = useRouter();
  const cartOpen = useCartStore((state) => state.cartOpen);
  const setCartOpen = useCartStore((state) => state.setCartOpen);
  const cart = useCartStore((state) => state.cart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  // Calculate subtotal. If price is in paise, subtotal will be in paise.
  // Standard prices in DB are in paise (e.g. 299900 = ₹2,999.00).
  // Let's assume cart items store price in paise. If a price is less than 10000 (e.g. 2499), 
  // it might be in rupees. Let's normalise to paise for formatPrice.
  const getNormalizedPriceInPaise = (price: number) => {
    // If price is likely in rupees (e.g. 2499 instead of 249900), convert to paise
    if (price < 10000) {
      return price * 100;
    }
    return price;
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + getNormalizedPriceInPaise(item.price) * item.quantity,
    0
  );

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

      {/* Body */}
      <DrawerBody className="space-y-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center space-y-5 px-4">
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
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {cart.map((item) => {
              const priceInPaise = getNormalizedPriceInPaise(item.price);
              
              return (
                <div key={item.id} className="py-4.5 flex gap-4 first:pt-0 last:pb-0">
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
                          Variant: {item.variantName}
                        </span>
                      )}
                      {(item.shape || item.length || item.size) && (
                        <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground/80 font-light">
                          {item.shape && <span>Shape: {item.shape}</span>}
                          {item.length && <span>Length: {item.length}</span>}
                          {item.size && <span>Size: {item.size}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {/* Quantity Selector */}
                      <div className="flex items-center bg-secondary/45 border border-border/20 rounded-full p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-background hover:text-foreground text-muted-foreground transition-all cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-2.5 h-2.5" />
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
        )}
      </DrawerBody>

      {/* Footer */}
      {cart.length > 0 && (
        <DrawerFooter className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Estimated Shipping</span>
              <span className="text-foreground font-medium">Free</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold border-t border-border/10 pt-2 text-foreground">
              <span>Subtotal</span>
              <span className="text-primary font-serif">{formatPrice(subtotal)}</span>
            </div>
          </div>
          <Button onClick={handleCheckout} className="w-full py-6 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 group">
            Proceed to Checkout
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </DrawerFooter>
      )}
    </Drawer>
  );
}
