import { Suspense } from "react";
import WishlistClient from "@/features/wishlist/wishlist-client";

export const metadata = {
  title: "Your Wishlist | Snail Studio",
  description: "Browse and manage your wishlisted custom press-on nail sets. View your favorites, quick add to cart, and get ready for your next manicure.",
};

export default function WishlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-light text-muted-foreground">Loading your wishlist...</span>
        </div>
      }
    >
      <WishlistClient />
    </Suspense>
  );
}
