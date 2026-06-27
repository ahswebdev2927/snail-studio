"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShoppingBag, 
  MapPin, 
  Truck, 
  CreditCard, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Lock, 
  Tag, 
  Percent, 
  Sparkles,
  Phone,
  User as UserIcon,
  Mail,
  Loader2,
  Bookmark
} from "lucide-react";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { Button } from "@/components/ui/button";
import { formatPrice, cn } from "@/lib/utils";
import { calculateBundleDiscount } from "@/lib/bundles";
import { 
  getCheckoutCustomer, 
  syncCartToDb, 
  getShippingRules, 
  createCheckoutOrder 
} from "./actions";

type CheckoutStep = "address" | "shipping" | "payment" | "review";

export default function CheckoutClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState<any>(null);
  
  // Login Bypass State
  const [loginPhone, setLoginPhone] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Address Step State
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  
  // Shipping Address Form
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingFlat, setShippingFlat] = useState("");
  const [shippingArea, setShippingArea] = useState("");
  const [shippingLandmark, setShippingLandmark] = useState("");
  const [shippingPincode, setShippingPincode] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingCountry, setShippingCountry] = useState("India");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);

  // Billing Address Form (if different)
  const [billingName, setBillingName] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingFlat, setBillingFlat] = useState("");
  const [billingArea, setBillingArea] = useState("");
  const [billingLandmark, setBillingLandmark] = useState("");
  const [billingPincode, setBillingPincode] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingCountry, setBillingCountry] = useState("India");

  // Shipping Method Step State
  const [shippingRules, setShippingRules] = useState({ standardFee: 99, freeThreshold: 1500, expressFee: 250 });
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");

  // Payment Method Step State
  const [paymentGateway, setPaymentGateway] = useState<"razorpay">("razorpay");

  // Coupons State
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [activeBundles, setActiveBundles] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/bundles/active")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveBundles(data);
        }
      })
      .catch((err) => console.error("Failed to load active bundles on checkout page:", err));
  }, []);

  // Step wizard navigation
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("address");

  // Zustand Store
  const cart = useCartStore((state) => state.cart);
  const clearCart = useCartStore((state) => state.clearCart);

  // Load Razorpay Script
  useEffect(() => {
    setMounted(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Fetch session, addresses, and shipping configurations
  const initCheckout = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const custRes = await getCheckoutCustomer();
      if (custRes.success && custRes.user) {
        setUser(custRes.user);
        setSavedAddresses(custRes.savedAddresses || []);
        
        // Pre-fill shipping form with user defaults if available
        if (custRes.user.name) setShippingName(custRes.user.name);
        if (custRes.user.phoneNumber) setShippingPhone(custRes.user.phoneNumber);
        
        // If user has saved addresses, select the default or first one
        if (custRes.savedAddresses && custRes.savedAddresses.length > 0) {
          const defaultAddr = custRes.savedAddresses.find((a: any) => a.isDefault) || custRes.savedAddresses[0];
          setSelectedAddressId(defaultAddr.id);
          applySavedAddress(defaultAddr);
        }
      } else {
        setUser(null);
      }

      const rulesRes = await getShippingRules();
      if (rulesRes.success) {
        setShippingRules({
          standardFee: rulesRes.standardFee,
          freeThreshold: rulesRes.freeThreshold,
          expressFee: rulesRes.expressFee
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("An error occurred initializing the checkout page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      initCheckout();
    }
  }, [mounted]);

  // Apply saved address fields to form state
  const applySavedAddress = (addr: any) => {
    setShippingName(addr.name);
    setShippingPhone(addr.phone);
    setShippingFlat(addr.addressLine1);
    // Parse area and landmark out of addressLine2 if possible, or just copy it
    setShippingArea(addr.addressLine2 || "");
    setShippingPincode(addr.postalCode);
    setShippingCity(addr.city);
    setShippingState(addr.state);
    setShippingCountry(addr.country);
  };

  const handleSavedAddressChange = (id: string) => {
    setSelectedAddressId(id);
    if (id === "new") {
      setShippingName(user?.name || "");
      setShippingPhone(user?.phoneNumber || "");
      setShippingFlat("");
      setShippingArea("");
      setShippingLandmark("");
      setShippingPincode("");
      setShippingCity("");
      setShippingState("");
    } else {
      const addr = savedAddresses.find((a) => a.id === id);
      if (addr) applySavedAddress(addr);
    }
  };

  // Mock login bypass for testing
  const handleLoginBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone) {
      setErrorMsg("Phone number is required");
      return;
    }

    setLoginLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login-mock-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: loginPhone,
          name: loginName || undefined,
          email: loginEmail || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Reload to re-fetch session details
        await initCheckout();
      } else {
        setErrorMsg(data.error || "Failed to log in via dev bypass.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Error authenticating. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const getNormalizedPriceInPaise = (price: number) => {
    if (price < 10000) {
      return price * 100;
    }
    return price;
  };

  // Calculate cart subtotal in paise
  const cartSubtotal = cart.reduce((sum, item) => {
    return sum + getNormalizedPriceInPaise(item.price) * item.quantity;
  }, 0);

  // Convert shipping rules from Rupees to Paise
  const standardFeeInPaise = shippingRules.standardFee * 100;
  const freeThresholdInPaise = shippingRules.freeThreshold * 100;
  const expressFeeInPaise = shippingRules.expressFee * 100;

  // Calculate dynamic shipping cost in paise
  const isShippingFree = cartSubtotal >= freeThresholdInPaise;
  const standardShippingCost = isShippingFree ? 0 : standardFeeInPaise;
  const shippingCost = shippingMethod === "standard" ? standardShippingCost : expressFeeInPaise;

  // Coupon calculations (already in paise from validate endpoint)
  const discountVal = appliedCoupon ? appliedCoupon.discountAmount : 0;

  const { totalDiscount: bundleDiscount } = calculateBundleDiscount(cart, activeBundles);

  // Final Total in paise
  const finalTotal = Math.max(0, cartSubtotal + shippingCost - discountVal - bundleDiscount);

  // Validate coupon
  const handleValidateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    setValidatingCoupon(true);
    setCouponError("");
    setCouponSuccess("");

    try {
      const res = await fetch("/api/admin/settings"); // dummy check to get credentials or similar, wait, validate endpoint exists
      const valRes = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          subtotal: cartSubtotal // validate api takes paise
        })
      });

      const data = await valRes.json();
      if (valRes.ok && data.valid) {
        setAppliedCoupon(data);
        setCouponSuccess(`Coupon '${data.code}' applied successfully! Saved ${formatPrice(data.discountAmount)}`);
      } else {
        setCouponError(data.error || "Invalid coupon code.");
      }
    } catch (err) {
      console.error(err);
      setCouponError("Failed to validate coupon code.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponSuccess("");
  };

  // Form validations for steps
  const validateAddressStep = () => {
    if (!shippingName.trim() || !shippingPhone.trim() || !shippingFlat.trim() || !shippingArea.trim() || !shippingPincode.trim() || !shippingCity.trim() || !shippingState.trim()) {
      setErrorMsg("Please fill out all required shipping address fields.");
      return false;
    }
    if (!billingSameAsShipping) {
      if (!billingName.trim() || !billingPhone.trim() || !billingFlat.trim() || !billingArea.trim() || !billingPincode.trim() || !billingCity.trim() || !billingState.trim()) {
        setErrorMsg("Please fill out all required billing address fields.");
        return false;
      }
    }
    setErrorMsg("");
    return true;
  };

  const handleStepSubmit = (step: CheckoutStep) => {
    if (step === "address") {
      if (validateAddressStep()) setCurrentStep("shipping");
    } else if (step === "shipping") {
      setCurrentStep("payment");
    } else if (step === "payment") {
      setCurrentStep("review");
    }
  };

  // Place order and trigger payment gateway
  const handlePlaceOrder = async () => {
    setProcessingOrder(true);
    setErrorMsg("");

    try {
      // 1. Map Zustand items to DB schema format
      const variantItems = cart.map((item) => ({
        variantId: item.id,
        quantity: item.quantity
      }));

      // 2. Synchronize Zustand local cart with database cart
      const syncRes = await syncCartToDb(variantItems);
      if (!syncRes.success || !syncRes.cartId) {
        throw new Error(syncRes.error || "Failed to sync cart with the database.");
      }

      const cartId = syncRes.cartId;

      // 3. Construct detailed addresses
      const shippingAddressLine2 = shippingArea + (shippingLandmark.trim() ? ` (Landmark: ${shippingLandmark.trim()})` : "");
      const shippingDetails = {
        name: shippingName,
        phone: shippingPhone,
        addressLine1: shippingFlat,
        addressLine2: shippingAddressLine2,
        city: shippingCity,
        state: shippingState,
        postalCode: shippingPincode,
        country: shippingCountry
      };

      let billingDetails = shippingDetails;
      if (!billingSameAsShipping) {
        const billingAddressLine2 = billingArea + (billingLandmark.trim() ? ` (Landmark: ${billingLandmark.trim()})` : "");
        billingDetails = {
          name: billingName,
          phone: billingPhone,
          addressLine1: billingFlat,
          addressLine2: billingAddressLine2,
          city: billingCity,
          state: billingState,
          postalCode: billingPincode,
          country: billingCountry
        };
      }

      // 4. Call server action to process order and payment session
      const orderRes = await createCheckoutOrder({
        cartId,
        shippingAddress: shippingDetails,
        billingAddress: billingDetails,
        notes: deliveryInstructions || undefined,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        discountAmount: (appliedCoupon ? appliedCoupon.discountAmount : 0) + bundleDiscount, // sum of coupon and bundle discounts (paise)
        shippingAmount: shippingCost // already in paise
      });

      if (!orderRes.success || !orderRes.result) {
        throw new Error(orderRes.error || "Failed to create order.");
      }

      const { orderId, paymentSession } = orderRes.result;

      // 5. Handle Mock payment vs Razorpay modal
      if (paymentSession.gateway === "mock" && paymentSession.checkoutUrl) {
        // Append cart ID to clear it upon mock checkout success
        const mockPayUrl = `${paymentSession.checkoutUrl}&cartId=${cartId}`;
        router.push(mockPayUrl);
      } else if (paymentSession.gateway === "razorpay") {
        if (!(window as any).Razorpay) {
          throw new Error("Razorpay payment gateway failed to load. Please refresh the page and try again.");
        }

        const options = {
          key: paymentSession.keyId,
          amount: paymentSession.amount,
          currency: paymentSession.currency,
          name: "Snail Studio",
          description: "Premium Handcrafted Press-On Nails",
          order_id: paymentSession.id,
          handler: async function (response: any) {
            setLoading(true);
            try {
              const confirmRes = await fetch("/api/payments/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: orderId,
                  paymentId: response.razorpay_payment_id,
                  gatewayOrderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                  cartId: cartId
                })
              });
              
              const confirmData = await confirmRes.json();
              if (confirmRes.ok && confirmData.success) {
                clearCart();
                router.push(`/checkout/success?orderId=${orderId}`);
              } else {
                setErrorMsg(confirmData.error || "Payment confirmation failed. Please contact support.");
                setLoading(false);
              }
            } catch (err: any) {
              console.error(err);
              setErrorMsg("An error occurred during payment verification.");
              setLoading(false);
            }
          },
          prefill: {
            name: shippingDetails.name,
            contact: shippingDetails.phone,
            email: user?.email || ""
          },
          theme: {
            color: "#8b6e60"
          },
          modal: {
            ondismiss: function () {
              setProcessingOrder(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to initiate payment. Please try again.");
      setProcessingOrder(false);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs font-light text-muted-foreground font-sans">Initializing checkout...</span>
      </div>
    );
  }

  // Intercept and show storefront login bypass if unauthenticated
  if (!user) {
    return (
      <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[70vh] px-4 py-12">
        <div className="w-full max-w-md bg-card border border-border/40 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-secondary/40 rounded-full text-primary mb-1">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">Secure Checkout</h2>
            <p className="text-xs text-muted-foreground font-light max-w-xs mx-auto">
              Please sign in to proceed with your premium press-on nails order.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-[11px] rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginBypass} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 text-primary" /> Mobile Number
              </label>
              <input
                type="tel"
                required
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="+91 99999 88888"
                className="w-full px-4 py-3 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-primary" /> Full Name (Optional)
              </label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="Elina Roy"
                className="w-full px-4 py-3 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3 text-primary" /> Email Address (Optional)
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="elina@example.com"
                className="w-full px-4 py-3 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
              />
            </div>

            <div className="pt-2">
              <div className="border-t border-border/10 my-4 pt-4 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Developer Mode
                </span>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 px-5 bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loginLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>AUTO-LOGIN AS CUSTOMER (DEV BYPASS)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // If cart is empty, show empty state
  if (cart.length === 0) {
    return (
      <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-16 h-16 bg-secondary/40 rounded-full flex items-center justify-center text-muted-foreground animate-bounce">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-serif text-xl font-medium">Your checkout is empty</h2>
          <p className="text-xs text-muted-foreground font-light max-w-xs leading-relaxed">
            Please add items to your cart before proceeding to checkout.
          </p>
        </div>
        <Button onClick={() => router.push("/shop")} variant="outline" className="rounded-xl text-xs font-medium cursor-pointer">
          Browse Collections
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 md:px-8 py-10 max-w-7xl mx-auto">
      
      {/* Checkout step bar */}
      <div className="mb-10 max-w-xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border/40 -translate-y-1/2 z-0" />
          
          {[
            { id: "address", label: "Address", icon: MapPin },
            { id: "shipping", label: "Shipping", icon: Truck },
            { id: "payment", label: "Payment", icon: CreditCard },
            { id: "review", label: "Review", icon: Eye }
          ].map((s, index) => {
            const Icon = s.icon;
            const steps: CheckoutStep[] = ["address", "shipping", "payment", "review"];
            const currentIdx = steps.indexOf(currentStep);
            const thisIdx = steps.indexOf(s.id as CheckoutStep);
            const isCompleted = thisIdx < currentIdx;
            const isActive = s.id === currentStep;

            return (
              <div key={s.id} className="flex flex-col items-center relative z-10">
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border transition-all text-xs",
                    isCompleted 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : isActive 
                        ? "bg-background border-primary text-primary scale-110 shadow-sm" 
                        : "bg-background border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="w-4.5 h-4.5" /> : index + 1}
                </div>
                <span 
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider mt-2.5",
                    isActive ? "text-primary font-bold" : "text-muted-foreground font-normal"
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-2xl flex items-start gap-2.5 max-w-3xl mx-auto leading-relaxed">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Forms on left, Order Summary on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Wizard Forms */}
        <div className="lg:col-span-7 bg-card border border-border/40 rounded-3xl p-6 md:p-8 space-y-6">
          
          {/* STEP 1: ADDRESS */}
          {currentStep === "address" && (
            <div className="space-y-6">
              <div className="space-y-1 border-b border-border/20 pb-4">
                <h2 className="font-serif text-lg font-normal text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Shipping Information
                </h2>
                <p className="text-[10px] text-muted-foreground font-light">
                  Please enter where you'd like your luxury handcrafted nails delivered.
                </p>
              </div>

              {savedAddresses.length > 0 && (
                <div className="space-y-2 bg-secondary/20 p-4.5 rounded-2xl border border-border/20">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                    <Bookmark className="w-3 h-3 text-primary" /> Select Saved Address
                  </label>
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => (
                      <label 
                        key={addr.id}
                        className={cn(
                          "flex items-start gap-3 p-3 bg-card border rounded-xl cursor-pointer hover:border-primary/50 transition-all text-xs",
                          selectedAddressId === addr.id ? "border-primary ring-1 ring-primary" : "border-border/60"
                        )}
                      >
                        <input 
                          type="radio" 
                          name="saved_address" 
                          checked={selectedAddressId === addr.id}
                          onChange={() => handleSavedAddressChange(addr.id)}
                          className="mt-0.5 text-primary focus:ring-primary focus:ring-0" 
                        />
                        <div className="flex-1 font-sans space-y-1">
                          <p className="font-semibold text-foreground flex items-center gap-2">
                            {addr.name} {addr.isDefault && <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Default</span>}
                          </p>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {addr.addressLine1}, {addr.addressLine2 ? `${addr.addressLine2}, ` : ""}{addr.city}, {addr.state} - {addr.postalCode}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80 font-mono">{addr.phone}</p>
                        </div>
                      </label>
                    ))}
                    <label 
                      className={cn(
                        "flex items-center gap-3 p-3 bg-card border rounded-xl cursor-pointer hover:border-primary/50 transition-all text-xs",
                        selectedAddressId === "new" ? "border-primary ring-1 ring-primary" : "border-border/60"
                      )}
                    >
                      <input 
                        type="radio" 
                        name="saved_address" 
                        checked={selectedAddressId === "new"}
                        onChange={() => handleSavedAddressChange("new")}
                        className="text-primary focus:ring-primary focus:ring-0" 
                      />
                      <span className="font-medium text-foreground">Add a new delivery address</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mobile number *</label>
                    <input 
                      type="tel" 
                      required 
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Flat, House no, Building, Apartment *</label>
                  <input 
                    type="text" 
                    required 
                    value={shippingFlat}
                    onChange={(e) => setShippingFlat(e.target.value)}
                    placeholder="Apartment 4B, Emerald Heights"
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Area, Street, Sector, Village *</label>
                    <input 
                      type="text" 
                      required 
                      value={shippingArea}
                      onChange={(e) => setShippingArea(e.target.value)}
                      placeholder="MG Road, Sector 15"
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Landmark</label>
                    <input 
                      type="text" 
                      value={shippingLandmark}
                      onChange={(e) => setShippingLandmark(e.target.value)}
                      placeholder="Near City Mall"
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pincode *</label>
                    <input 
                      type="text" 
                      required 
                      value={shippingPincode}
                      onChange={(e) => setShippingPincode(e.target.value)}
                      placeholder="400001"
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Town/City *</label>
                    <input 
                      type="text" 
                      required 
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      placeholder="Mumbai"
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">State *</label>
                    <input 
                      type="text" 
                      required 
                      value={shippingState}
                      onChange={(e) => setShippingState(e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Country *</label>
                    <input 
                      type="text" 
                      required 
                      disabled
                      value={shippingCountry}
                      className="w-full px-4 py-2.5 bg-secondary/10 border border-border rounded-xl text-xs outline-none text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delivery Instructions (optional)</label>
                  <textarea 
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Drop at the front desk, ring bell twice, call before arriving..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground resize-none"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={billingSameAsShipping}
                      onChange={() => setBillingSameAsShipping(!billingSameAsShipping)}
                      className="rounded border-border text-primary focus:ring-primary" 
                    />
                    <span>My billing address is the same as my shipping address</span>
                  </label>
                </div>
              </div>

              {/* Billing Address Form if not the same */}
              {!billingSameAsShipping && (
                <div className="pt-4 border-t border-border/20 space-y-4 animate-in fade-in">
                  <div className="space-y-1 pb-2">
                    <h3 className="font-serif text-sm font-medium text-foreground">Billing Address</h3>
                    <p className="text-[10px] text-muted-foreground font-light">
                      Please enter your billing address details below.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={billingName}
                        onChange={(e) => setBillingName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mobile number *</label>
                      <input 
                        type="tel" 
                        required 
                        value={billingPhone}
                        onChange={(e) => setBillingPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Flat, House no, Building, Apartment *</label>
                    <input 
                      type="text" 
                      required 
                      value={billingFlat}
                      onChange={(e) => setBillingFlat(e.target.value)}
                      placeholder="Apartment 4B, Emerald Heights"
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Area, Street, Sector, Village *</label>
                      <input 
                        type="text" 
                        required 
                        value={billingArea}
                        onChange={(e) => setBillingArea(e.target.value)}
                        placeholder="MG Road, Sector 15"
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Landmark</label>
                      <input 
                        type="text" 
                        value={billingLandmark}
                        onChange={(e) => setBillingLandmark(e.target.value)}
                        placeholder="Near City Mall"
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pincode *</label>
                      <input 
                        type="text" 
                        required 
                        value={billingPincode}
                        onChange={(e) => setBillingPincode(e.target.value)}
                        placeholder="400001"
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Town/City *</label>
                      <input 
                        type="text" 
                        required 
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        placeholder="Mumbai"
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">State *</label>
                      <input 
                        type="text" 
                        required 
                        value={billingState}
                        onChange={(e) => setBillingState(e.target.value)}
                        placeholder="Maharashtra"
                        className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Country *</label>
                      <input 
                        type="text" 
                        required 
                        disabled
                        value={billingCountry}
                        className="w-full px-4 py-2.5 bg-secondary/10 border border-border rounded-xl text-xs outline-none text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border/20 flex justify-end">
                <Button 
                  onClick={() => handleStepSubmit("address")}
                  className="rounded-xl px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Continue to Shipping</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: SHIPPING METHOD */}
          {currentStep === "shipping" && (
            <div className="space-y-6">
              <div className="space-y-1 border-b border-border/20 pb-4">
                <h2 className="font-serif text-lg font-normal text-foreground flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" /> Delivery Method
                </h2>
                <p className="text-[10px] text-muted-foreground font-light">
                  Select your preferred delivery speed and courier handling.
                </p>
              </div>

              <div className="space-y-3">
                <label 
                  className={cn(
                    "flex items-center justify-between p-4.5 bg-card border rounded-2xl cursor-pointer transition-all hover:border-primary/50",
                    shippingMethod === "standard" ? "border-primary ring-1 ring-primary" : "border-border/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="shipping_method" 
                      checked={shippingMethod === "standard"}
                      onChange={() => setShippingMethod("standard")}
                      className="text-primary focus:ring-primary focus:ring-0" 
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">Standard Delivery</p>
                      <p className="text-[10px] text-muted-foreground font-light">Takes 5-7 business days across India.</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-foreground font-mono">
                    {standardShippingCost === 0 ? "FREE" : formatPrice(standardShippingCost)}
                  </span>
                </label>

                <label 
                  className={cn(
                    "flex items-center justify-between p-4.5 bg-card border rounded-2xl cursor-pointer transition-all hover:border-primary/50",
                    shippingMethod === "express" ? "border-primary ring-1 ring-primary" : "border-border/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="shipping_method" 
                      checked={shippingMethod === "express"}
                      onChange={() => setShippingMethod("express")}
                      className="text-primary focus:ring-primary focus:ring-0" 
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">Express Delivery</p>
                      <p className="text-[10px] text-muted-foreground font-light">Guaranteed delivery in 2-3 business days.</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-foreground font-mono">
                    {formatPrice(expressFeeInPaise)}
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-border/20 flex justify-between">
                <Button 
                  onClick={() => setCurrentStep("address")}
                  variant="outline"
                  className="rounded-xl px-5 py-2.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Address</span>
                </Button>
                <Button 
                  onClick={() => handleStepSubmit("shipping")}
                  className="rounded-xl px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT */}
          {currentStep === "payment" && (
            <div className="space-y-6">
              <div className="space-y-1 border-b border-border/20 pb-4">
                <h2 className="font-serif text-lg font-normal text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" /> Payment Method
                </h2>
                <p className="text-[10px] text-muted-foreground font-light">
                  Select payment gateway. Payments are processed securely.
                </p>
              </div>

              <div className="space-y-3">
                <label 
                  className={cn(
                    "flex items-center justify-between p-4.5 bg-card border rounded-2xl cursor-pointer transition-all",
                    paymentGateway === "razorpay" ? "border-primary ring-1 ring-primary" : "border-border/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="payment_gateway" 
                      checked={paymentGateway === "razorpay"}
                      onChange={() => setPaymentGateway("razorpay")}
                      className="text-primary focus:ring-primary focus:ring-0" 
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        Razorpay Gateway <span className="text-[8.5px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Secure</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-light">Pay instantly via UPI, Cards, NetBanking, or Wallet.</p>
                    </div>
                  </div>
                  <div className="h-5 flex items-center gap-1 text-muted-foreground/40 text-[9px] font-bold tracking-widest font-sans uppercase">
                    UPI / cards / wallets
                  </div>
                </label>
              </div>

              <div className="p-4 bg-secondary/30 rounded-2xl border border-border/20 flex items-start gap-3">
                <Lock className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="text-[11px] font-semibold text-foreground">Secure Billing Guarantee</p>
                  <p className="text-[10px] text-muted-foreground font-light">
                    Your personal credentials and transaction logs are encrypted using industrial security protocols. Snail Studio does not store payment credentials.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border/20 flex justify-between">
                <Button 
                  onClick={() => setCurrentStep("shipping")}
                  variant="outline"
                  className="rounded-xl px-5 py-2.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Shipping</span>
                </Button>
                <Button 
                  onClick={() => handleStepSubmit("payment")}
                  className="rounded-xl px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Review Order</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {currentStep === "review" && (
            <div className="space-y-6">
              <div className="space-y-1 border-b border-border/20 pb-4">
                <h2 className="font-serif text-lg font-normal text-foreground flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" /> Review & Submit
                </h2>
                <p className="text-[10px] text-muted-foreground font-light">
                  Double check your checkout details and order items before finalizing.
                </p>
              </div>

              {/* Review details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div className="p-4 bg-secondary/20 rounded-2xl space-y-2 border border-border/10">
                  <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Shipping Destination</p>
                  <p className="font-bold text-foreground">{shippingName}</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {shippingFlat}, {shippingArea}, {shippingLandmark ? `Landmark: ${shippingLandmark}, ` : ""}{shippingCity}, {shippingState} - {shippingPincode}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">{shippingPhone}</p>
                </div>
                
                <div className="p-4 bg-secondary/20 rounded-2xl space-y-2 border border-border/10">
                  <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Courier & Payment</p>
                  <div>
                    <p className="font-bold text-foreground">Delivery Speed</p>
                    <p className="text-muted-foreground text-[11px]">
                      {shippingMethod === "express" ? "Express Handling (2-3 days)" : "Standard Handling (5-7 days)"}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Payment Gateway</p>
                    <p className="text-muted-foreground text-[11px] uppercase">{paymentGateway}</p>
                  </div>
                </div>
              </div>

              {deliveryInstructions && (
                <div className="p-4 bg-secondary/20 rounded-2xl border border-border/10 text-xs font-sans space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Delivery Instructions</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">"{deliveryInstructions}"</p>
                </div>
              )}

              <div className="pt-4 border-t border-border/20 flex justify-between">
                <Button 
                  onClick={() => setCurrentStep("payment")}
                  variant="outline"
                  disabled={processingOrder}
                  className="rounded-xl px-5 py-2.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Payment</span>
                </Button>
                
                <Button 
                  onClick={handlePlaceOrder}
                  disabled={processingOrder}
                  className="rounded-xl px-6 py-2.5 bg-accent text-accent-foreground hover:bg-accent/95 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {processingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Order...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Place Order & Pay {formatPrice(finalTotal)}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Sticky Order Summary */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 bg-card border border-border/40 rounded-3xl p-6 space-y-6">
          <div className="border-b border-border/20 pb-4">
            <h3 className="font-serif text-base font-normal text-foreground">Order Summary</h3>
          </div>

          {/* Cart items list */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
            {cart.map((item) => {
              const priceInPaise = getNormalizedPriceInPaise(item.price);
              return (
                <div key={item.id} className="flex gap-3 text-xs">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-12 h-12 object-cover rounded-lg border border-border/30 bg-secondary/10 shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-border/30 bg-secondary/20 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4 text-muted-foreground/60" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[13px] font-normal truncate text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground font-light mt-0.5 truncate">
                      {[
                        item.variantName,
                        item.shape && `Shape: ${item.shape}`,
                        item.length && `Length: ${item.length}`,
                        item.size && `Size: ${item.size}`
                      ].filter(Boolean).join(" | ")}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1 font-mono">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-foreground self-center shrink-0">
                    {formatPrice(priceInPaise * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Coupon Code Entry */}
          <div className="border-t border-b border-border/20 py-4.5 space-y-3">
            {!appliedCoupon ? (
              <form onSubmit={handleValidateCoupon} className="flex gap-2">
                <input 
                  type="text" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="PROMO CODE"
                  className="flex-1 px-3 py-2 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-[11px] outline-none text-foreground font-mono uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
                />
                <button
                  type="submit"
                  disabled={validatingCoupon || !couponCode}
                  className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                >
                  {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                  <span>Apply</span>
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-sans text-[11px]">
                    <p className="font-bold text-emerald-500 font-mono">{appliedCoupon.code}</p>
                    <p className="text-[10px] text-emerald-500/80">Coupon Applied Successfully</p>
                  </div>
                </div>
                <button 
                  onClick={removeCoupon}
                  className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors px-2 py-1 bg-secondary/40 rounded-lg cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}

            {couponError && (
              <p className="text-[10px] text-destructive flex items-center gap-1 leading-normal">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{couponError}</span>
              </p>
            )}
            {couponSuccess && (
              <p className="text-[10px] text-emerald-500 flex items-center gap-1 leading-normal">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{couponSuccess}</span>
              </p>
            )}
          </div>

          {/* Pricing calculations */}
          <div className="space-y-2.5 text-xs font-sans border-b border-border/20 pb-4.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">{formatPrice(cartSubtotal)}</span>
            </div>
            
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping Fee</span>
              <span className="font-mono">
                {shippingCost === 0 ? "FREE" : formatPrice(shippingCost)}
              </span>
            </div>

            {appliedCoupon && (
              <div className="flex justify-between text-emerald-500">
                <span className="flex items-center gap-1">Discount ({appliedCoupon.code})</span>
                <span className="font-mono font-semibold text-emerald-500">-{formatPrice(discountVal)}</span>
              </div>
            )}

            {bundleDiscount > 0 && (
              <div className="flex justify-between text-emerald-500">
                <span>Bundle Discount</span>
                <span className="font-mono font-semibold text-emerald-500">-{formatPrice(bundleDiscount)}</span>
              </div>
            )}


          </div>

          <div className="flex justify-between font-serif text-base font-normal text-foreground">
            <span>Total amount</span>
            <span className="font-mono text-base font-bold text-primary">{formatPrice(finalTotal)}</span>
          </div>

          <div className="text-[10px] text-muted-foreground font-light text-center leading-normal pt-1.5 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-muted-foreground/60" /> SSL SECURE 256-BIT CHECKOUT
          </div>
        </div>

      </div>
    </div>
  );
}
