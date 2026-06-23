import React from "react";
import { AnnouncementBar } from "@/components/storefront/announcement-bar";
import { Header } from "@/components/storefront/header";
import { SearchOverlay } from "@/components/storefront/search-overlay";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { Footer } from "@/components/storefront/footer";
import { getStorefrontNavigation } from "@/services/navigation";

export const metadata = {
  title: "Shop Luxury Nails | Snail Studio",
  description: "Experience salon-quality manicures from home with our custom-designed, luxury press-on nails.",
};

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigationData = await getStorefrontNavigation();

  return (
    <>
      <AnnouncementBar />
      <Header navigationData={navigationData} />
      <main className="flex-1 flex flex-col transition-colors duration-300">
        {children}
      </main>
      <SearchOverlay />
      <CartDrawer />
      <Footer />
    </>
  );
}

