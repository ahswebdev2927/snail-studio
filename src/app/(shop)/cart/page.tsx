import { Suspense } from "react";
import CartClient from "@/features/cart/cart-client";

export const metadata = {
  title: "Your Shopping Cart | Snail Studio",
  description: "Review your handcrafted press-on nails, edit quantities, apply discount codes, and complete your checkout securely.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-light text-muted-foreground font-sans">Loading your cart...</span>
        </div>
      }
    >
      <CartClient />
    </Suspense>
  );
}
