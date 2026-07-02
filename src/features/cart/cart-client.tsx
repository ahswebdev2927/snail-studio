"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Tag, 
  Info, 
  CheckCircle2, 
  Percent, 
  HelpCircle,
  Heart,
  Loader2
} from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { formatPrice, cn } from "@/lib/utils";
import { getCartCrossSellProducts, validateCartStock } from "@/features/cart/actions";
import { calculateBundleDiscount } from "@/lib/bundles";
import CloudinaryImage from "@/components/media/cloudinary-image";
import { getWishlistProducts } from "@/features/wishlist/actions";

export default function CartClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  // Cross-sell & Save for later states
  const [crossSells, setCrossSells] = useState<any[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loadingCrossSells, setLoadingCrossSells] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  const [activeBundles, setActiveBundles] = useState<any[]>([]);

  useEffect(() => {
    if (mounted) {
      fetch("/api/bundles/active")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setActiveBundles(data);
          }
        })
        .catch((err) => console.error("Failed to load active bundles on cart page:", err));
    }
  }, [mounted]);

  const cart = useCartStore((state) => state.cart);
  const wishlist = useCartStore((state) => state.wishlist);
  const toggleWishlist = useCartStore((state) => state.toggleWishlist);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch cross-sells on mount/cart changes
  useEffect(() => {
    if (!mounted) return;
    const fetchCrossSells = async () => {
      setLoadingCrossSells(true);
      try {
        const variantIds = cart.map((item) => item.id);
        const res = await getCartCrossSellProducts(variantIds);
        if (res.success && res.products) {
          setCrossSells(res.products);
        }
      } catch (err) {
        console.error("Failed to load cross-sells:", err);
      } finally {
        setLoadingCrossSells(false);
      }
    };
    fetchCrossSells();
  }, [mounted, cart]);

  // Fetch wishlist items on mount/wishlist changes
  useEffect(() => {
    if (!mounted) return;
    const fetchWishlist = async () => {
      if (wishlist.length === 0) {
        setWishlistProducts([]);
        return;
      }
      setLoadingWishlist(true);
      try {
        const res = await getWishlistProducts(wishlist);
        if (res.success && res.products) {
          setWishlistProducts(res.products);
        }
      } catch (err) {
        console.error("Failed to load wishlist products:", err);
      } finally {
        setLoadingWishlist(false);
      }
    };
    fetchWishlist();
  }, [mounted, wishlist]);

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

  useEffect(() => {
    if (subtotal === 0 && appliedCoupon) {
      setAppliedCoupon(null);
      setCouponSuccess("");
      setCouponCode("");
    }
  }, [subtotal, appliedCoupon]);

  // Shipping calculations (Threshold: ₹3,000 / 300000 paise)
  const freeShippingThreshold = 300000;
  const remainingForFreeShipping = freeShippingThreshold - subtotal;
  const isFreeShipping = remainingForFreeShipping <= 0;
  const freeShippingProgress = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const shippingFee = isFreeShipping ? 0 : 9900; // Flat ₹99 standard shipping

  // Dynamic discount calculation
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === "percentage") {
      discountAmount = Math.floor((subtotal * appliedCoupon.discountValue) / 100);
    } else {
      discountAmount = Math.min(appliedCoupon.discountAmount, subtotal);
    }
  }

  const { totalDiscount: bundleDiscount } = calculateBundleDiscount(cart, activeBundles);

  const total = subtotal - discountAmount - bundleDiscount + shippingFee;

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

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setValidating(true);
    setCouponError("");
    setCouponSuccess("");

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        setAppliedCoupon(data);
        setCouponSuccess(`Coupon "${data.code}" applied successfully!`);
      } else {
        setCouponError(data.error || "Failed to validate coupon");
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error(err);
      setCouponError("An error occurred while validating coupon");
      setAppliedCoupon(null);
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess("");
    setCouponCode("");
  };

  const handleSaveForLater = async (item: any) => {
    const prodId = item.productId || item.id;
    if (!prodId) return;

    if (!wishlist.includes(prodId)) {
      await toggleWishlist(prodId);
    }
    removeFromCart(item.id);
  };

  const handleMoveToCart = (product: any) => {
    let imgUrl = "/luxury_nails_hero.png";
    if (product.media && product.media.length > 0) {
      imgUrl = product.media[0].media?.url || product.media[0].url || imgUrl;
    }

    const activeVariant = product.variants?.find((v: any) => v.status === "Active") || product.variants?.[0];

    if (activeVariant) {
      const getAttributeLabel = (groupCode: string) => {
        return activeVariant.attributes?.find((a: any) => a.groupCode === groupCode)?.valueName;
      };

      addToCart({
        id: activeVariant.id,
        name: product.name,
        price: activeVariant.price / 100,
        imageUrl: imgUrl,
        variantName: activeVariant.name,
        shape: getAttributeLabel("shape"),
        length: getAttributeLabel("length"),
        size: getAttributeLabel("size"),
        productId: product.id,
      });
    } else {
      const priceInRupees = product.priceMin / 100;
      addToCart({
        id: product.id,
        name: product.name,
        price: priceInRupees,
        imageUrl: imgUrl,
        variantName: "Standard Set",
        productId: product.id,
      });
    }

    toggleWishlist(product.id);
  };

  if (!mounted) {
    return (
      <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm font-light text-muted-foreground font-sans">Syncing your bag...</span>
      </div>
    );
  }

  // Common JSX structure for Saved for Later items
  const renderSavedForLaterList = () => (
    <div className="divide-y divide-border/10">
      {wishlistProducts.map((product) => {
        const priceInPaise = product.priceMin;
        let primaryImage = "/luxury_nails_hero.png";
        if (product.media && product.media.length > 0) {
          primaryImage = product.media[0].media?.url || product.media[0].url || primaryImage;
        }

        return (
          <div key={product.id} className="py-4.5 flex gap-4 first:pt-0 last:pb-0">
            {/* Image */}
            <div className="w-16 h-16 bg-secondary/30 border border-border/40 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center">
              <CloudinaryImage
                src={primaryImage}
                variant="thumbnail"
                alt={product.name}
                fill
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="font-serif text-sm font-semibold text-foreground line-clamp-1">
                  {product.name}
                </h4>
                <span className="text-xs text-primary font-serif font-semibold block">
                  {formatPrice(priceInPaise)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleMoveToCart(product)}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-xs active:scale-95"
                >
                  Move to Bag
                </button>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="p-2 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 rounded-full transition-colors cursor-pointer"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const handleProceedToCheckout = async () => {
    setStockError(null);
    setIsCheckingStock(true);
    try {
      const items = cart.map((c) => ({ variantId: c.id, quantity: c.quantity }));
      const checkRes = await validateCartStock(items);
      if (!checkRes.success) {
        setStockError(checkRes.error || "Failed to validate stock. Please try again.");
        return;
      }
      if (!checkRes.isAllAvailable) {
        const failedItems = (checkRes.validation || [])
          .filter((v) => !v.hasSufficientStock)
          .map((v) => {
            const cartItem = cart.find((c) => c.id === v.variantId);
            return `"${cartItem?.name || "Item"}" (Available: ${v.availableStock})`;
          })
          .join(", ");
        setStockError(`Insufficient stock for: ${failedItems}. Please update your quantities.`);
        return;
      }
      router.push("/checkout");
    } catch (err: any) {
      setStockError("An error occurred. Please try again.");
    } finally {
      setIsCheckingStock(false);
    }
  };

  return (
    <div className="flex-1 bg-background text-foreground max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Breadcrumb */}
      <nav className="flex mb-6 text-xs text-muted-foreground font-light font-sans gap-2" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-primary transition-colors cursor-pointer">
          Home
        </Link>
        <span>/</span>
        <span className="text-foreground">Cart</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-wide text-foreground flex items-baseline gap-3">
          Your Shopping Bag
          {cart.length > 0 && (
            <span className="font-sans font-light text-muted-foreground text-lg md:text-xl">
              ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
            </span>
          )}
        </h1>
        <p className="text-xs text-muted-foreground font-light font-sans mt-1">
          Review your items, apply offers, and prepare for your home manicure.
        </p>
      </div>

      {cart.length === 0 ? (
        /* Empty State */
        <div className="space-y-12 max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-card/35 border border-border/20 rounded-3xl backdrop-blur-xs space-y-6">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center border border-border/10 shadow-xs relative">
              <ShoppingBag className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-semibold">Your bag is empty</h2>
              <p className="text-xs text-muted-foreground font-light max-w-sm mx-auto leading-relaxed font-sans">
                Add some premium handcrafted press-on nail sets to your bag to enjoy a luxurious manicure in minutes.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 shadow-md group cursor-pointer"
            >
              Explore Catalog
              <ArrowRight className="w-3.5 h-3.5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {/* Popular Collections */}
            <div className="pt-8 border-t border-border/10 w-full max-w-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Or Browse Popular Categories
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                  href="/shop?shape=coffin"
                  className="px-4 py-2.5 bg-secondary/35 border border-border/20 hover:border-primary/20 hover:bg-secondary/60 rounded-xl text-center text-xs font-medium text-foreground transition-all duration-200"
                >
                  Coffin Nails
                </Link>
                <Link
                  href="/shop?shape=almond"
                  className="px-4 py-2.5 bg-secondary/35 border border-border/20 hover:border-primary/20 hover:bg-secondary/60 rounded-xl text-center text-xs font-medium text-foreground transition-all duration-200"
                >
                  Almond Nails
                </Link>
                <Link
                  href="/shop?category=nail-art"
                  className="px-4 py-2.5 bg-secondary/35 border border-border/20 hover:border-primary/20 hover:bg-secondary/60 rounded-xl text-center text-xs font-medium text-foreground transition-all duration-200"
                >
                  Nail Art
                </Link>
                <Link
                  href="/shop"
                  className="px-4 py-2.5 bg-secondary/35 border border-border/20 hover:border-primary/20 hover:bg-secondary/60 rounded-xl text-center text-xs font-medium text-foreground transition-all duration-200"
                >
                  All Styles
                </Link>
              </div>
            </div>
          </div>

          {/* Saved for Later when empty */}
          {wishlistProducts.length > 0 && (
            <div className="bg-card border border-border/30 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-border/10 pb-4">
                <h3 className="font-serif text-lg font-normal text-foreground flex items-center gap-2">
                  Saved for Later
                  <span className="font-sans font-light text-muted-foreground text-sm">
                    ({wishlistProducts.length})
                  </span>
                </h3>
                {loadingWishlist && (
                  <span className="text-[10px] text-muted-foreground animate-pulse flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Updating...
                  </span>
                )}
              </div>
              {renderSavedForLaterList()}
            </div>
          )}
        </div>
      ) : (
        /* Cart Page Content */
        <div className="space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Left Column: Cart Items & Add-ons */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-card border border-border/30 rounded-2xl p-6 md:p-8 shadow-xs">
                <h2 className="font-serif text-lg font-normal mb-6 text-foreground">Items in Your Bag</h2>
                <div className="divide-y divide-border/10">
                  {cart.map((item) => {
                    const priceInPaise = getNormalizedPriceInPaise(item.price);
                    const isAccessory = item.id.startsWith("accessory_");

                    return (
                      <div key={item.id} className="py-6 flex flex-col sm:flex-row gap-6 first:pt-0 last:pb-0">
                        {/* Image */}
                        <div className="w-24 h-24 bg-secondary/30 border border-border/40 rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center">
                          {item.imageUrl ? (
                            <CloudinaryImage
                              src={item.imageUrl}
                              variant="thumbnail"
                              alt={item.name}
                              fill
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between gap-4">
                            <div className="space-y-1">
                              <h3 className="font-serif text-base font-semibold text-foreground">
                                {item.name}
                              </h3>
                              {item.variantName && (
                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                                  {item.variantName}
                                </span>
                              )}
                              {!isAccessory && (item.shape || item.length || item.size) && (
                                <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground/80 font-light font-sans">
                                  {item.shape && <span>Shape: {item.shape}</span>}
                                  {item.length && <span>Length: {item.length}</span>}
                                  {item.size && <span>Size: {item.size}</span>}
                                </div>
                              )}
                            </div>
                            
                            {/* Item Subtotal */}
                            <span className="font-serif text-sm font-semibold text-foreground shrink-0 mt-0.5">
                              {formatPrice(priceInPaise * item.quantity)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                            {/* Quantity selector */}
                            {isAccessory ? (
                              <span className="text-xs text-muted-foreground font-light font-sans">
                                Add-on Upgrade
                              </span>
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
                                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-background hover:text-foreground text-muted-foreground transition-all cursor-pointer"
                                  aria-label={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                                >
                                  {item.quantity === 1 ? (
                                    <Trash2 className="w-3 h-3 text-destructive/70" />
                                  ) : (
                                    <Minus className="w-3 h-3" />
                                  )}
                                </button>
                                <span className="px-3 text-xs font-semibold text-foreground min-w-[20px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-background hover:text-foreground text-muted-foreground transition-all cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {/* Individual price, save for later & quick delete */}
                            <div className="flex items-center gap-3.5">
                              <span className="text-xs text-muted-foreground font-sans">
                                {formatPrice(priceInPaise)} each
                              </span>
                              {!isAccessory && (
                                <button
                                  onClick={() => handleSaveForLater(item)}
                                  className="text-[10px] text-primary hover:text-primary-foreground font-bold uppercase tracking-wider font-sans flex items-center gap-1.5 cursor-pointer bg-primary/5 hover:bg-primary px-3 py-1.5 rounded-full transition-all duration-300 border border-primary/10 hover:border-transparent active:scale-95"
                                  aria-label="Save for later"
                                >
                                  <Heart className="w-3.5 h-3.5" /> Save for Later
                                </button>
                              )}
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="p-1.5 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 rounded-full transition-colors cursor-pointer"
                                aria-label="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Complete Your Manicure Add-ons */}
              <div className="bg-card border border-border/30 rounded-2xl p-6 md:p-8 shadow-xs space-y-5">
                <div>
                  <h3 className="font-serif text-lg font-normal text-foreground">Complete Your Manicure</h3>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5">
                    Select premium accessories to ensure perfect application and reuse.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sizing Kit */}
                  <div
                    className={cn(
                      "flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300",
                      hasSizingKit
                        ? "border-primary/40 bg-primary/5 shadow-xs"
                        : "border-border/20 bg-secondary/10 hover:border-border/40 hover:bg-secondary/20"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-base">📏</span>
                        </div>
                        <span className="text-xs font-serif font-semibold text-foreground">₹150</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Sizing Kit (All Shapes)</h4>
                        <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
                          Sizing kits include all 10 standard sizes of your selected nail shapes. Highly recommended for a perfect fit guarantee.
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-border/10 flex items-center justify-between">
                      <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
                        {hasSizingKit ? "Added to Cart" : "Recommendation"}
                      </span>
                      <button
                        onClick={handleToggleSizingKit}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer",
                          hasSizingKit
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {hasSizingKit ? "Remove" : "Add to Cart"}
                      </button>
                    </div>
                  </div>

                  {/* Gift Wrap */}
                  <div
                    className={cn(
                      "flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300",
                      hasGiftWrap
                        ? "border-primary/40 bg-primary/5 shadow-xs"
                        : "border-border/20 bg-secondary/10 hover:border-border/40 hover:bg-secondary/20"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-base">🎁</span>
                        </div>
                        <span className="text-xs font-serif font-semibold text-foreground">₹199</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Premium Gift Box & Prep Kit</h4>
                        <p className="text-xs text-muted-foreground font-light leading-relaxed mt-1">
                          Gift box packaging with complete tool set: brush-on nail glue, mini nail buffer, orange wood stick, alcohol prep pads, and adhesive tabs.
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-border/10 flex items-center justify-between">
                      <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
                        {hasGiftWrap ? "Added to Cart" : "Recommendation"}
                      </span>
                      <button
                        onClick={handleToggleGiftWrap}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer",
                          hasGiftWrap
                            ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                      >
                        {hasGiftWrap ? "Remove" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saved for Later Section in Left Column */}
              {wishlistProducts.length > 0 && (
                <div className="bg-card border border-border/30 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
                  <div className="flex justify-between items-center border-b border-border/10 pb-4">
                    <h3 className="font-serif text-lg font-normal text-foreground flex items-center gap-2">
                      Saved for Later
                      <span className="font-sans font-light text-muted-foreground text-sm">
                        ({wishlistProducts.length})
                      </span>
                    </h3>
                    {loadingWishlist && (
                      <span className="text-[10px] text-muted-foreground animate-pulse flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Updating...
                      </span>
                    )}
                  </div>
                  {renderSavedForLaterList()}
                </div>
              )}
            </div>

            {/* Right Column: Order Summary */}
            <div className="space-y-6 lg:sticky lg:top-8">
              {/* Free Shipping Tracker Card */}
              <div className="bg-card border border-border/30 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-muted-foreground">
                    {isFreeShipping ? "🎉 Free Shipping Unlocked!" : "Free Shipping Goal"}
                  </span>
                  <span className="text-primary">
                    {isFreeShipping ? "Qualified" : `Spend ${formatPrice(remainingForFreeShipping)} more`}
                  </span>
                </div>
                <div className="w-full h-2 bg-secondary/60 border border-border/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/80 font-light leading-relaxed">
                  {isFreeShipping
                    ? "Your order qualifies for free standard shipping!"
                    : `Add just ${formatPrice(remainingForFreeShipping)} more to save the flat ₹99 standard shipping charge.`}
                </p>
              </div>

              {/* Summary details */}
              <div className="bg-card border border-border/30 rounded-2xl p-6 shadow-xs space-y-6">
                <h2 className="font-serif text-lg font-normal text-foreground border-b border-border/10 pb-4">
                  Order Summary
                </h2>

                <div className="space-y-4 text-xs font-sans">
                  {/* Subtotal */}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-foreground">{formatPrice(subtotal)}</span>
                  </div>

                  {/* Bundle Discount */}
                  {bundleDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Bundle Discount</span>
                      <span className="font-semibold">-{formatPrice(bundleDiscount)}</span>
                    </div>
                  )}

                  {/* Coupon Application */}
                  {appliedCoupon ? (
                    <div className="flex justify-between text-emerald-600 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                          <Tag className="w-3 h-3 shrink-0" />
                          Code: {appliedCoupon.code}
                        </div>
                        <p className="text-[9px] font-light">
                          {appliedCoupon.discountType === "percentage" 
                            ? `${appliedCoupon.discountValue}% discount applied` 
                            : "Fixed discount applied"
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">-{formatPrice(discountAmount)}</span>
                        <button 
                          onClick={handleRemoveCoupon}
                          className="text-muted-foreground/60 hover:text-destructive text-[10px] uppercase font-bold tracking-wider underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Promotional Coupon
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. SNAILGLAM"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="flex-1 bg-secondary/15 border border-border/20 rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground/50 focus:outline-hidden focus:border-primary/50 uppercase"
                        />
                        <button
                          type="submit"
                          disabled={validating || !couponCode.trim()}
                          className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground disabled:bg-muted disabled:text-muted-foreground disabled:border-transparent px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                        >
                          {validating ? "Checking" : "Apply"}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-[10px] text-destructive font-medium mt-1 pl-1">
                          {couponError}
                        </p>
                      )}
                      {couponSuccess && (
                        <p className="text-[10px] text-emerald-600 font-medium mt-1 pl-1">
                          {couponSuccess}
                        </p>
                      )}
                    </form>
                  )}

                  {/* Shipping cost */}
                  <div className="flex justify-between text-muted-foreground border-t border-border/10 pt-4">
                    <span>Estimated Shipping</span>
                    <span className="font-semibold text-foreground">
                      {shippingFee === 0 ? (
                        <span className="text-emerald-600 font-bold uppercase tracking-wider text-[10px]">Free</span>
                      ) : (
                        formatPrice(shippingFee)
                      )}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between text-sm font-semibold border-t border-border/10 pt-4 text-foreground">
                    <span>Grand Total</span>
                    <span className="text-primary font-serif text-base">{formatPrice(total)}</span>
                  </div>
                </div>

                {stockError && (
                  <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex gap-2.5 items-start">
                    <Info className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Stock Out Alert</p>
                      <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                        {stockError}
                      </p>
                    </div>
                  </div>
                )}

                {/* Checkout Action */}
                <Button
                  disabled={isCheckingStock}
                  onClick={handleProceedToCheckout}
                  className="w-full py-6 text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 group cursor-pointer"
                >
                  {isCheckingStock ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking Stock...
                    </>
                  ) : (
                    <>
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 pt-6 border-t border-border/10 text-center text-muted-foreground">
                  <div className="flex flex-col items-center">
                    <span className="text-base">💅</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 mt-1.5 leading-none">Handcrafted</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-base">🔄</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 mt-1.5 leading-none">Reusable</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-base">🛡️</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 mt-1.5 leading-none">Secure Pay</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* You May Also Like (Cross-Sells) Section */}
      {crossSells.length > 0 && (
        <div className="mt-20 pt-16 border-t border-border/10 space-y-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Recommended For You</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-foreground mt-1">
                You May Also Like
              </h2>
            </div>
            {loadingCrossSells && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse font-sans">
                <Loader2 className="w-3 h-3 animate-spin text-primary" /> Updating...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {crossSells.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
