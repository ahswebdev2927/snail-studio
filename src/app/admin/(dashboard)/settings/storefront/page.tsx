"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Image as ImageIcon, Megaphone, Ruler, Scale, LayoutGrid } from "lucide-react";
import HeroBannersTab from "@/components/admin/settings/hero-banners-tab";
import AnnouncementsTab from "@/components/admin/settings/announcements-tab";
import SizeProfilesTab from "@/components/admin/settings/size-profiles-tab";
import LengthChartTab from "@/components/admin/settings/length-chart-tab";
import ShopDropdownTab from "@/components/admin/settings/shop-dropdown-tab";

type TabName = "banners" | "announcements" | "sizing" | "length-chart" | "shop-dropdown";

function StorefrontSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Determine starting tab based on URL query parameter
  const tabParam = searchParams.get("tab") as TabName;
  const initialTab: TabName = ["banners", "announcements", "sizing", "length-chart", "shop-dropdown"].includes(tabParam)
    ? tabParam
    : "banners";

  const [activeTab, setActiveTab] = useState<TabName>(initialTab);

  // Sync tab state if query parameter changes
  useEffect(() => {
    const currentTab = searchParams.get("tab") as TabName;
    if (currentTab && ["banners", "announcements", "sizing", "length-chart", "shop-dropdown"].includes(currentTab)) {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    // Update URL query parameter
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/admin/settings/storefront?${params.toString()}`);
  };

  const tabClasses = (tab: TabName) => {
    const base = "px-4.5 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap";
    const active = "border-primary text-primary font-bold";
    const inactive = "border-transparent text-muted-foreground hover:text-foreground";
    return `${base} ${activeTab === tab ? active : inactive}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Storefront Design & Content</h1>
          <p className="text-xs text-muted-foreground font-light">
            Configure storefront carousel banners, homepage announcement ticks, size guides, and shape length charts.
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-border/40 overflow-x-auto scrollbar-none flex">
        <button type="button" onClick={() => handleTabChange("banners")} className={tabClasses("banners")}>
          <ImageIcon className="w-4 h-4" />
          Hero Banners
        </button>
        <button type="button" onClick={() => handleTabChange("announcements")} className={tabClasses("announcements")}>
          <Megaphone className="w-4 h-4" />
          Announcements
        </button>
        <button type="button" onClick={() => handleTabChange("sizing")} className={tabClasses("sizing")}>
          <Scale className="w-4 h-4" />
          Sizing Profiles
        </button>
        <button type="button" onClick={() => handleTabChange("length-chart")} className={tabClasses("length-chart")}>
          <Ruler className="w-4 h-4" />
          Length Chart
        </button>
        <button type="button" onClick={() => handleTabChange("shop-dropdown")} className={tabClasses("shop-dropdown")}>
          <LayoutGrid className="w-4 h-4" />
          Shop Dropdown
        </button>
      </div>

      {/* Active Tab Panel Widget */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm">
        {activeTab === "banners" && <HeroBannersTab />}
        {activeTab === "announcements" && <AnnouncementsTab />}
        {activeTab === "sizing" && <SizeProfilesTab />}
        {activeTab === "length-chart" && <LengthChartTab />}
        {activeTab === "shop-dropdown" && <ShopDropdownTab />}
      </div>
    </div>
  );
}

export default function StorefrontSettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-xs text-muted-foreground font-light">Loading storefront configurations...</p>
      </div>
    }>
      <StorefrontSettingsContent />
    </Suspense>
  );
}
