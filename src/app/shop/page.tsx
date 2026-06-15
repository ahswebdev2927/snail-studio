import { Suspense } from "react";
import ShopCatalog from "./shop-catalog";

export const metadata = {
  title: "Shop Luxury Nails | Snail Studio Catalog",
  description: "Browse and filter our custom-designed, luxury press-on nail sets. Filter by nail shape, length, finish/texture, color, and price to find your perfect fit.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 bg-background text-foreground flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm font-light text-muted-foreground">Loading premium catalog...</span>
      </div>
    }>
      <ShopCatalog />
    </Suspense>
  );
}
