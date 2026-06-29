import { Suspense } from "react";
import ShopCatalog from "./shop-catalog";
import { CatalogSkeleton } from "@/components/storefront/skeletons/catalog-skeleton";

export const metadata = {
  title: "Shop Luxury Nails | Snail Studio Catalog",
  description: "Browse and filter our custom-designed, luxury press-on nail sets. Filter by nail shape, length, finish/texture, color, and price to find your perfect fit.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <ShopCatalog />
    </Suspense>
  );
}
