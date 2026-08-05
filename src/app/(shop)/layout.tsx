import React from "react";
import { AnnouncementBar } from "@/components/storefront/announcement-bar";
import { Header } from "@/components/storefront/header";
import { SearchOverlay } from "@/components/storefront/search-overlay";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { BottomNav } from "@/components/storefront/bottom-nav";
import dynamic from "next/dynamic";
import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import { AnalyticsTracker } from "@/components/analytics-tracker";

const Footer = dynamic(
  () => import("@/components/storefront/footer").then(mod => mod.Footer),
  {
    loading: () => <div className="w-full h-80 bg-background animate-pulse border-t border-border" />,
  }
);
import { getStorefrontNavigation } from "@/services/navigation";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getSystemSettingsMap } from "@/services/settings";

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

  // Fetch cached system settings map
  const settingsMap = await getSystemSettingsMap();

  // Extract announcement bar settings from map
  const barSettingsString = settingsMap["announcement_bar_settings"];
  let barSettings = null;
  if (barSettingsString) {
    try {
      barSettings = JSON.parse(barSettingsString);
    } catch (e) {
      console.error("Failed to parse announcement bar settings JSON:", e);
    }
  }

  const storeLogo = settingsMap["store_logo"] || "";
  const storeName = settingsMap["store_name"] || "Snail Studio";

  return (
    <>
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                send_page_view: false
              });
            `}
          </Script>
        </>
      )}
      <AnalyticsTracker />
      <AnnouncementBar announcements={activeAnnouncements} settings={barSettings} />
      <Header navigationData={navigationData} storeLogo={storeLogo} storeName={storeName} />
      <main className="flex-1 flex flex-col transition-colors duration-300 pb-16 md:pb-0">
        {children}
      </main>
      <SearchOverlay />
      <CartDrawer />
      <BottomNav />
      <Footer storeLogo={storeLogo} storeName={storeName} />
    </>
  );
}

