import { Suspense } from "react";
import CheckoutClient from "@/features/checkout/checkout-client";

export const metadata = {
  title: "Secure Checkout | Snail Studio",
  description: "Complete your purchase of luxury handcrafted press-on nails securely. Enter shipping address, choose delivery speed, and pay.",
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback = {
        <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-light text-muted-foreground font-sans">Loading checkout details...</span>
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}
