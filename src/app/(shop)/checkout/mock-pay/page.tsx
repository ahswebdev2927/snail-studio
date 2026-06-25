"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, AlertCircle, ArrowLeft, Loader2, Sparkles, XCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import { Button } from "@/components/ui/button";

function MockPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const orderId = searchParams.get("orderId");
  const gatewayOrderId = searchParams.get("gatewayOrderId");
  const amountStr = searchParams.get("amount");
  const cartId = searchParams.get("cartId");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const clearCart = useCartStore((state) => state.clearCart);

  const amountInPaise = amountStr ? Number(amountStr) : 0;

  // Make sure we have the required params
  useEffect(() => {
    if (!orderId || !gatewayOrderId || !amountStr) {
      setError("Missing payment parameters. Unable to simulate payment.");
    }
  }, [orderId, gatewayOrderId, amountStr]);

  const handleSimulateSuccess = async () => {
    if (!orderId || !gatewayOrderId) return;
    setLoading(true);
    setError("");

    try {
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 14)}`;
      
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          paymentId: mockPaymentId,
          gatewayOrderId,
          signature: "mock_sig_success",
          cartId: cartId || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Clear client side Zustand cart
        clearCart();
        // Redirect to success landing page
        router.push(`/checkout/success?orderId=${orderId}`);
      } else {
        setError(data.error || "Failed to confirm payment simulation.");
      }
    } catch (err: any) {
      console.error(err);
      setError("An unexpected error occurred during confirmation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFailure = () => {
    // Redirect back to checkout with simulated failure notice
    router.push(`/checkout?error=Payment+authorization+was+simulated+as+failed.+Please+try+again.`);
  };

  if (error) {
    return (
      <div className="w-full max-w-md bg-card border border-border/40 rounded-3xl p-8 text-center space-y-4">
        <XCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="font-serif text-xl font-normal text-foreground">Simulation Error</h2>
        <p className="text-xs text-muted-foreground font-light leading-relaxed">{error}</p>
        <Button onClick={() => router.push("/checkout")} variant="outline" className="w-full rounded-xl text-xs font-medium cursor-pointer">
          Back to Checkout
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-card border border-border/40 rounded-3xl p-8 space-y-6 shadow-sm">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-accent/10 rounded-full text-accent mb-1">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="font-serif text-2xl font-normal tracking-wide text-foreground">Payment Gateway</h2>
        <p className="text-[10px] text-muted-foreground font-light tracking-wider uppercase">
          Demo Offline Simulator
        </p>
      </div>

      <div className="p-4 bg-secondary/35 rounded-2xl border border-border/20 text-xs font-sans space-y-2.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground font-light">Order ID</span>
          <span className="font-mono font-medium text-foreground">{orderId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground font-light">Gateway Order ID</span>
          <span className="font-mono font-medium text-foreground">{gatewayOrderId}</span>
        </div>
        <div className="border-t border-border/30 my-2 pt-2 flex justify-between font-serif text-sm">
          <span className="text-foreground">Payable Amount</span>
          <span className="font-mono font-bold text-primary">{formatPrice(amountInPaise)}</span>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <button
          onClick={handleSimulateSuccess}
          disabled={loading}
          className="w-full py-3.5 px-5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ShieldCheck className="w-4.5 h-4.5" />
              <span>SIMULATE SUCCESSFUL PAYMENT</span>
            </>
          )}
        </button>

        <button
          onClick={handleSimulateFailure}
          disabled={loading}
          className="w-full py-3 px-5 bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <AlertCircle className="w-4.5 h-4.5" />
          <span>SIMULATE FAILED PAYMENT</span>
        </button>
      </div>

      <div className="pt-2 border-t border-border/10 flex justify-center">
        <button 
          onClick={() => router.push("/checkout")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel & Back to Checkout</span>
        </button>
      </div>
    </div>
  );
}

export default function MockPayPage() {
  return (
    <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[75vh] px-4 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-card border border-border/40 rounded-3xl p-8 text-center space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground font-light">Loading simulator details...</p>
          </div>
        }
      >
        <MockPayContent />
      </Suspense>
    </div>
  );
}
