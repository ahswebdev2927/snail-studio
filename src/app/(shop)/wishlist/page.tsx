import { Suspense } from "react";
import WishlistClient from "@/features/wishlist/wishlist-client";
import { WishlistSkeleton } from "@/components/storefront/skeletons/wishlist-skeleton";

export const metadata = {
  title: "Your Wishlist | Snail Studio",
  description: "Browse and manage your wishlisted custom press-on nail sets. View your favorites, quick add to cart, and get ready for your next manicure.",
};

export default function WishlistPage() {
  return (
    <Suspense fallback={<WishlistSkeleton />}>
      <WishlistClient />
    </Suspense>
  );
}
