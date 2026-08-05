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
import { trackBeginCheckout, trackApplyCoupon, trackAddShippingInfo, trackAddPaymentInfo } from "@/lib/analytics";
import { formatPrice, cn } from "@/lib/utils";
import { calculateBundleDiscount } from "@/lib/bundles";
import CloudinaryImage from "@/components/media/cloudinary-image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/forms/form";
import { FormField } from "@/components/forms/form-field";
import { InputField, TextareaField } from "@/components/forms/fields";
import { notify } from "@/lib/toast";
import { 
  getCheckoutCustomer, 
  syncCartToDb, 
  getShippingRules, 
  createCheckoutOrder,
  reserveCartStockOnCheckout
} from "./actions";

type CheckoutStep = "address" | "shipping" | "review";

export default function CheckoutClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isStockOut, setIsStockOut] = useState(false);
  


  // Address Step State
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  
  // RHF Setup
  const form = useForm({
    resolver: zodResolver(
      z.object({
        shippingAddress: z.object({
          name: z.string().min(1, "Recipient name is required").max(100),
          phone: z.string().regex(/^\+91\d{10}$/, "Phone number must start with +91 followed by 10 digits"),
          addressLine1: z.string().min(1, "Flat/House address details are required").max(250),
          addressLine2: z.string().min(1, "Area/Sector details are required").max(250),
          landmark: z.string().max(150).optional().or(z.literal("")),
          city: z.string().min(1, "City is required").max(100),
          state: z.string().min(1, "State is required").max(100),
          postalCode: z.string().regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit Indian PIN code"),
          country: z.string().default("India"),
        }),
        billingSameAsShipping: z.boolean().default(true),
        billingAddress: z.object({
          name: z.string().max(100).optional().or(z.literal("")),
          phone: z.string().optional().or(z.literal("")),
          addressLine1: z.string().max(250).optional().or(z.literal("")),
          addressLine2: z.string().max(250).optional().or(z.literal("")),
          landmark: z.string().max(150).optional().or(z.literal("")),
          city: z.string().max(100).optional().or(z.literal("")),
          state: z.string().max(100).optional().or(z.literal("")),
          postalCode: z.string().optional().or(z.literal("")),
          country: z.string().default("India"),
        }),
        deliveryInstructions: z.string().max(500).optional().or(z.literal("")),
      }).superRefine((data, ctx) => {
        if (!data.billingSameAsShipping) {
          if (!data.billingAddress.name?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Recipient name is required", path: ["billingAddress", "name"] });
          }
          if (!data.billingAddress.phone?.trim() || !/^\+91\d{10}$/.test(data.billingAddress.phone)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid mobile number is required (+91...)", path: ["billingAddress", "phone"] });
          }
          if (!data.billingAddress.addressLine1?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Address details are required", path: ["billingAddress", "addressLine1"] });
          }
          if (!data.billingAddress.addressLine2?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Area details are required", path: ["billingAddress", "addressLine2"] });
          }
          if (!data.billingAddress.city?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "City is required", path: ["billingAddress", "city"] });
          }
          if (!data.billingAddress.state?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "State is required", path: ["billingAddress", "state"] });
          }
          if (!data.billingAddress.postalCode?.trim() || !/^[1-9][0-9]{5}$/.test(data.billingAddress.postalCode)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid 6-digit Indian PIN code is required", path: ["billingAddress", "postalCode"] });
          }
        }
      })
    ),
    defaultValues: {
      shippingAddress: {
        name: "",
        phone: "+91",
        addressLine1: "",
        addressLine2: "",
        landmark: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      },
      billingSameAsShipping: true,
      billingAddress: {
        name: "",
        phone: "+91",
        addressLine1: "",
        addressLine2: "",
        landmark: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      },
      deliveryInstructions: "",
    },
    mode: "onBlur",
  });

  const billingSameAsShipping = form.watch("billingSameAsShipping");
  const shippingAddress = form.watch("shippingAddress") || {};
  const billingAddress = form.watch("billingAddress") || {};
  const deliveryInstructions = form.watch("deliveryInstructions") || "";

  // Reactivity aliases
  const shippingName = shippingAddress.name || "";
  const shippingPhone = shippingAddress.phone || "";
  const shippingFlat = shippingAddress.addressLine1 || "";
  const shippingArea = shippingAddress.addressLine2 || "";
  const shippingLandmark = shippingAddress.landmark || "";
  const shippingPincode = shippingAddress.postalCode || "";
  const shippingCity = shippingAddress.city || "";
  const shippingState = shippingAddress.state || "";
  const shippingCountry = shippingAddress.country || "India";

  const billingName = billingAddress.name || "";
  const billingPhone = billingAddress.phone || "";
  const billingFlat = billingAddress.addressLine1 || "";
  const billingArea = billingAddress.addressLine2 || "";
  const billingLandmark = billingAddress.landmark || "";
  const billingPincode = billingAddress.postalCode || "";
  const billingCity = billingAddress.city || "";
  const billingState = billingAddress.state || "";
  const billingCountry = billingAddress.country || "India";

  const formatPhoneNumber = (val: string) => {
    let digits = val.replace(/\s+/g, "");
    if (!digits) return "";
    if (!digits.startsWith("+91")) {
      const raw = digits.replace(/[^\d]/g, "");
      if (raw.startsWith("91") && raw.length > 2) {
        digits = "+" + raw;
      } else {
        digits = "+91" + raw;
      }
    }
    return digits.slice(0, 13);
  };

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
  const trackedCheckoutRef = React.useRef(false);
  useEffect(() => {
    if (mounted && cart.length > 0 && !trackedCheckoutRef.current) {
      trackedCheckoutRef.current = true;
      trackBeginCheckout(
        cart.map((item) => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price / 100, // paise to standard INR Rupees
          quantity: item.quantity,
          item_variant: item.variantName,
        })),
        cart.reduce((acc, curr) => acc + (curr.price / 100) * curr.quantity, 0)
      );
    }
  }, [mounted, cart]);

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
      let custRes = await getCheckoutCustomer();

      // If unauthorized, attempt to refresh the token first
      if (!custRes.success || !custRes.user) {
        console.log("No valid user session. Attempting to refresh access token...");
        try {
          const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
          if (refreshRes.ok) {
            // Token refreshed, retry fetching customer data
            custRes = await getCheckoutCustomer();
          }
        } catch (refreshErr) {
          console.error("Token refresh attempt failed:", refreshErr);
        }
      }

      if (custRes.success && custRes.user) {
        setUser(custRes.user);
        setSavedAddresses(custRes.savedAddresses || []);
        
        // Pre-fill shipping form with user defaults if available
        if (custRes.user.name) form.setValue("shippingAddress.name", custRes.user.name);
        if (custRes.user.phoneNumber) form.setValue("shippingAddress.phone", custRes.user.phoneNumber);
        
        // If user has saved addresses, select the default or first one
        if (custRes.savedAddresses && custRes.savedAddresses.length > 0) {
          const defaultAddr = custRes.savedAddresses.find((a: any) => a.isDefault) || custRes.savedAddresses[0];
          setSelectedAddressId(defaultAddr.id);
          applySavedAddress(defaultAddr);
        }
      } else {
        setUser(null);
        router.push("/login?callbackUrl=/checkout");
        return; // exit early
      }

      const rulesRes = await getShippingRules();
      if (rulesRes.success) {
        setShippingRules({
          standardFee: rulesRes.standardFee,
          freeThreshold: rulesRes.freeThreshold,
          expressFee: rulesRes.expressFee
        });
      }

      // 4. Reserve cart stock early on mount
      if (cart && cart.length > 0) {
        const variantItems = cart.map((item) => ({
          variantId: item.id,
          quantity: item.quantity,
        }));
        const reserveRes = await reserveCartStockOnCheckout(variantItems);
        if (!reserveRes.success) {
          setErrorMsg(reserveRes.error || "Some items in your cart are no longer available in the requested quantities.");
          setIsStockOut(true);
          setLoading(false);
          return;
        }
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
    form.setValue("shippingAddress.name", addr.name, { shouldValidate: true });
    form.setValue("shippingAddress.phone", addr.phone, { shouldValidate: true });
    form.setValue("shippingAddress.addressLine1", addr.addressLine1, { shouldValidate: true });
    
    const rawLine2 = addr.addressLine2 || "";
    const parts = rawLine2.split(" | ");
    const labels = ["Home", "Work", "Hostel", "Other"];
    const areaPart = labels.includes(parts[0]) ? parts.slice(1).join(" | ") : rawLine2;
    
    const landmarkMatch = areaPart.match(/\s*\(Landmark:\s*([^)]+)\)/i);
    let area = areaPart;
    let landmark = "";
    if (landmarkMatch) {
      landmark = landmarkMatch[1];
      area = areaPart.replace(/\s*\(Landmark:\s*[^)]+\)/i, "");
    }
    
    form.setValue("shippingAddress.addressLine2", area, { shouldValidate: true });
    form.setValue("shippingAddress.landmark", landmark, { shouldValidate: true });
    form.setValue("shippingAddress.postalCode", addr.postalCode, { shouldValidate: true });
    form.setValue("shippingAddress.city", addr.city, { shouldValidate: true });
    form.setValue("shippingAddress.state", addr.state, { shouldValidate: true });
    form.setValue("shippingAddress.country", addr.country, { shouldValidate: true });
  };

  const handleSavedAddressChange = (id: string) => {
    setSelectedAddressId(id);
    if (id === "new") {
      form.reset({
        ...form.getValues(),
        shippingAddress: {
          name: user?.name || "",
          phone: user?.phoneNumber || "+91",
          addressLine1: "",
          addressLine2: "",
          landmark: "",
          city: "",
          state: "",
          postalCode: "",
          country: "India",
        }
      });
    } else {
      const addr = savedAddresses.find((a) => a.id === id);
      if (addr) applySavedAddress(addr);
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
      // Sync client cart state with database to obtain a valid cartId
      let cartId = null;
      const variantItems = cart.map((item) => ({
        variantId: item.id,
        quantity: item.quantity
      }));
      const syncRes = await syncCartToDb(variantItems);
      if (syncRes.success && syncRes.cartId) {
        cartId = syncRes.cartId;
      }

      const valRes = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          subtotal: cartSubtotal, // validate api takes paise
          cartId: cartId,
          userId: user?.id || null,
        })
      });

      const data = await valRes.json();
      if (valRes.ok && data.valid) {
        setAppliedCoupon(data);
        setCouponSuccess(`Coupon '${data.code}' applied successfully! Saved ${formatPrice(data.discountAmount)}`);
        trackApplyCoupon(data.code);
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

  const getGA4CartItems = () => {
    return cart.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price / 100, // paise to standard INR Rupees
      quantity: item.quantity,
      item_variant: item.variantName || undefined,
    }));
  };

  const getGA4CartValue = () => {
    return cart.reduce((acc, curr) => acc + (curr.price / 100) * curr.quantity, 0);
  };

  const handleStepSubmit = async (step: CheckoutStep) => {
    if (step === "address") {
      const isValid = await form.trigger([
        "shippingAddress.name",
        "shippingAddress.phone",
        "shippingAddress.addressLine1",
        "shippingAddress.addressLine2",
        "shippingAddress.city",
        "shippingAddress.state",
        "shippingAddress.postalCode",
      ]);

      const billingSame = form.getValues("billingSameAsShipping");
      let isBillingValid = true;
      if (!billingSame) {
        isBillingValid = await form.trigger([
          "billingAddress.name",
          "billingAddress.phone",
          "billingAddress.addressLine1",
          "billingAddress.addressLine2",
          "billingAddress.city",
          "billingAddress.state",
          "billingAddress.postalCode",
        ]);
      }

      if (isValid && isBillingValid) {
        setErrorMsg("");
        setCurrentStep("shipping");
      } else {
        notify.error("Please fill out all required address fields correctly.");
      }
    } else if (step === "shipping") {
      // Trigger GA4 add_shipping_info event
      trackAddShippingInfo(
        shippingMethod === "express" ? "Express Shipping" : "Standard Shipping",
        getGA4CartItems(),
        getGA4CartValue(),
        appliedCoupon?.code || undefined
      );
      // Trigger GA4 add_payment_info event (Razorpay is default)
      trackAddPaymentInfo(
        "Razorpay Gateway",
        getGA4CartItems(),
        getGA4CartValue(),
        appliedCoupon?.code || undefined
      );
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

      // 3. Construct detailed addresses from RHF
      const values = form.getValues();
      const shippingAddressLine2 = (values.shippingAddress.addressLine2 || "") + 
        (values.shippingAddress.landmark?.trim() ? ` (Landmark: ${values.shippingAddress.landmark.trim()})` : "");
      
      const shippingDetails = {
        name: values.shippingAddress.name || "",
        phone: values.shippingAddress.phone || "",
        addressLine1: values.shippingAddress.addressLine1 || "",
        addressLine2: shippingAddressLine2 || null,
        city: values.shippingAddress.city || "",
        state: values.shippingAddress.state || "",
        postalCode: values.shippingAddress.postalCode || "",
        country: values.shippingAddress.country || "India"
      };

      let billingDetails = shippingDetails;
      if (!values.billingSameAsShipping && values.billingAddress) {
        const billingAddressLine2 = (values.billingAddress.addressLine2 || "") + 
          (values.billingAddress.landmark?.trim() ? ` (Landmark: ${values.billingAddress.landmark.trim()})` : "");
        
        billingDetails = {
          name: values.billingAddress.name || "",
          phone: values.billingAddress.phone || "",
          addressLine1: values.billingAddress.addressLine1 || "",
          addressLine2: billingAddressLine2 || null,
          city: values.billingAddress.city || "",
          state: values.billingAddress.state || "",
          postalCode: values.billingAddress.postalCode || "",
          country: values.billingAddress.country || "India"
        };
      }

      // 4. Call server action to process order and payment session
      const orderRes = await createCheckoutOrder({
        cartId,
        shippingAddress: shippingDetails,
        billingAddress: billingDetails,
        notes: values.deliveryInstructions || undefined,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
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
            color: "#AC5429"
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

  // Redirect to login page if unauthenticated
  if (!user) {
    return (
      <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs font-light text-muted-foreground font-sans">Redirecting to authentication...</span>
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
    <Form methods={form as any} onSubmit={() => {}} className="min-h-screen bg-background text-foreground px-4 md:px-8 py-10 max-w-7xl mx-auto space-y-0">
      
      {/* Checkout step bar */}
      <div className="mb-10 max-w-xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border/40 -translate-y-1/2 z-0" />
          
          {[
            { id: "address", label: "Address", icon: MapPin },
            { id: "shipping", label: "Shipping", icon: Truck },
            { id: "review", label: "Review", icon: Eye }
          ].map((s, index) => {
            const Icon = s.icon;
            const steps: CheckoutStep[] = ["address", "shipping", "review"];
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

      {isStockOut ? (
        <div className="py-20 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center space-y-5 max-w-xl mx-auto p-8 shadow-sm animate-in fade-in duration-300">
          <div className="p-4.5 bg-destructive/10 text-destructive rounded-full">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-semibold tracking-wide text-foreground">Stock Availability Issue</h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              {errorMsg || "Some items in your cart are no longer available in the requested quantities. They may have sold out while you were shopping."}
            </p>
          </div>
          <Button
            onClick={() => router.push("/cart")}
            className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
          >
            Return to Cart
          </Button>
        </div>
      ) : (
        /* Main Grid: Forms on left, Order Summary on right */
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
                  <FormField name="shippingAddress.name" label="Full Name" required>
                    <InputField placeholder="Jane Doe" />
                  </FormField>
                  <FormField name="shippingAddress.phone" label="Mobile number" required>
                    <InputField
                      placeholder="+91 XXXXX XXXXX"
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        form.setValue("shippingAddress.phone", formatted, { shouldValidate: true });
                      }}
                    />
                  </FormField>
                </div>

                <FormField name="shippingAddress.addressLine1" label="Flat, House no, Building, Apartment" required>
                  <InputField placeholder="Apartment 4B, Emerald Heights" />
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField name="shippingAddress.addressLine2" label="Area, Street, Sector, Village" required>
                    <InputField placeholder="MG Road, Sector 15" />
                  </FormField>
                  <FormField name="shippingAddress.landmark" label="Landmark">
                    <InputField placeholder="Near City Mall" />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField name="shippingAddress.postalCode" label="Pincode" required>
                    <InputField placeholder="400001" />
                  </FormField>
                  <FormField name="shippingAddress.city" label="Town/City" required>
                    <InputField placeholder="Mumbai" />
                  </FormField>
                  <FormField name="shippingAddress.state" label="State" required>
                    <InputField placeholder="Maharashtra" />
                  </FormField>
                  <FormField name="shippingAddress.country" label="Country" required>
                    <InputField placeholder="India" disabled className="bg-secondary/10 text-muted-foreground cursor-not-allowed" />
                  </FormField>
                </div>

                <FormField name="deliveryInstructions" label="Delivery Instructions (optional)">
                  <TextareaField placeholder="Drop at the front desk, ring bell twice, call before arriving..." rows={2} />
                </FormField>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      {...form.register("billingSameAsShipping")}
                      className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer" 
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
                    <FormField name="billingAddress.name" label="Full Name" required>
                      <InputField placeholder="Jane Doe" />
                    </FormField>
                    <FormField name="billingAddress.phone" label="Mobile number" required>
                      <InputField
                        placeholder="+91 XXXXX XXXXX"
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          form.setValue("billingAddress.phone", formatted, { shouldValidate: true });
                        }}
                      />
                    </FormField>
                  </div>

                  <FormField name="billingAddress.addressLine1" label="Flat, House no, Building, Apartment" required>
                    <InputField placeholder="Apartment 4B, Emerald Heights" />
                  </FormField>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="billingAddress.addressLine2" label="Area, Street, Sector, Village" required>
                      <InputField placeholder="MG Road, Sector 15" />
                    </FormField>
                    <FormField name="billingAddress.landmark" label="Landmark">
                      <InputField placeholder="Near City Mall" />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField name="billingAddress.postalCode" label="Pincode" required>
                      <InputField placeholder="400001" />
                    </FormField>
                    <FormField name="billingAddress.city" label="Town/City" required>
                      <InputField placeholder="Mumbai" />
                    </FormField>
                    <FormField name="billingAddress.state" label="State" required>
                      <InputField placeholder="Maharashtra" />
                    </FormField>
                    <FormField name="billingAddress.country" label="Country" required>
                      <InputField placeholder="India" disabled className="bg-secondary/10 text-muted-foreground cursor-not-allowed" />
                    </FormField>
                  </div>
                </div>
              )}

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

              <div className="pt-4 border-t border-border/20 flex justify-start">
                <Button 
                  onClick={() => setCurrentStep("address")}
                  variant="outline"
                  className="rounded-xl px-5 py-2.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Address</span>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW */}
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
                    <p className="text-muted-foreground text-[11px] font-semibold text-primary">Razorpay Gateway (Secure)</p>
                  </div>
                </div>
              </div>

              {deliveryInstructions && (
                <div className="p-4 bg-secondary/20 rounded-2xl border border-border/10 text-xs font-sans space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider">Delivery Instructions</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">"{deliveryInstructions}"</p>
                </div>
              )}

              <div className="pt-4 border-t border-border/20 flex justify-start">
                <Button 
                  onClick={() => setCurrentStep("shipping")}
                  variant="outline"
                  disabled={processingOrder}
                  className="rounded-xl px-5 py-2.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Shipping</span>
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
                    <CloudinaryImage 
                      src={item.imageUrl} 
                      variant="thumbnail"
                      alt={item.name} 
                      className="w-12 h-12 rounded-lg border border-border/30 bg-secondary/10 shrink-0" 
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
            <Lock className="w-3.5 h-3.5 text-muted-foreground/60" /> SSL SECURE 256-BIT CHECKOUT
          </div>

          {/* Dynamic Action Button based on current step */}
          <div className="pt-2">
            {currentStep === "address" && (
              <Button 
                onClick={() => handleStepSubmit("address")}
                className="w-full rounded-xl py-3 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <span>Continue to Shipping</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {currentStep === "shipping" && (
              <Button 
                onClick={() => handleStepSubmit("shipping")}
                className="w-full rounded-xl py-3 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <span>Continue to Review</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {currentStep === "review" && (
              <Button 
                onClick={handlePlaceOrder}
                disabled={processingOrder}
                className="w-full rounded-xl py-3 bg-accent text-accent-foreground hover:bg-accent/95 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
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
            )}
          </div>
        </div>

      </div>
      )}
    </Form>
  );
}
