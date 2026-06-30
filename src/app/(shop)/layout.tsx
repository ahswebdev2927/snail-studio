import React from "react";
import { AnnouncementBar } from "@/components/storefront/announcement-bar";
import { Header } from "@/components/storefront/header";
import { SearchOverlay } from "@/components/storefront/search-overlay";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { Footer } from "@/components/storefront/footer";
import { getStorefrontNavigation } from "@/services/navigation";
import { db } from "@/db";
import { announcements, systemSettings } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

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

  // Fetch active announcements from DB
  const allActive = await db.query.announcements.findMany({
    where: eq(announcements.isActive, true),
    orderBy: asc(announcements.sortOrder),
  });

  // Filter scheduled announcements
  const now = new Date();
  const activeAnnouncements = allActive.filter((ann) => {
    const startValid = !ann.startDate || new Date(ann.startDate) <= now;
    const endValid = !ann.endDate || new Date(ann.endDate) >= now;
    return startValid && endValid;
  });

  // Fetch global bar settings
  const settingsRow = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, "announcement_bar_settings"),
  });

  let barSettings = null;
  if (settingsRow && settingsRow.value) {
    try {
      barSettings = JSON.parse(settingsRow.value);
    } catch (e) {
      console.error("Failed to parse announcement bar settings JSON:", e);
    }
  }

  // Fetch all system settings to extract store name and logo
  const systemSettingsRows = await db.select().from(systemSettings);
  const settingsMap = systemSettingsRows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);

  const storeLogo = settingsMap["store_logo"] || "";
  const storeName = settingsMap["store_name"] || "Snail Studio";

  return (
    <>
      <AnnouncementBar announcements={activeAnnouncements} settings={barSettings} />
      <Header navigationData={navigationData} storeLogo={storeLogo} storeName={storeName} />
      <main className="flex-1 flex flex-col transition-colors duration-300">
        {children}
      </main>
      <SearchOverlay />
      <CartDrawer />
      <Footer storeLogo={storeLogo} storeName={storeName} />
    </>
  );
}

