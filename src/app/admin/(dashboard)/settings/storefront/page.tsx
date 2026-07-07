"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Image as ImageIcon, Megaphone, Ruler } from "lucide-react";
import HeroBannersTab from "@/components/admin/settings/hero-banners-tab";
import AnnouncementsTab from "@/components/admin/settings/announcements-tab";
import SizeProfilesTab from "@/components/admin/settings/size-profiles-tab";

type TabName = "banners" | "announcements" | "sizing";

function StorefrontSettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Determine starting tab based on URL query parameter
  const tabParam = searchParams.get("tab") as TabName;
  const initialTab: TabName = ["banners", "announcements", "sizing"].includes(tabParam)
    ? tabParam
    : "banners";

  const [activeTab, setActiveTab] = useState<TabName>(initialTab);

  // Sync tab state if query parameter changes
  useEffect(() => {
    const currentTab = searchParams.get("tab") as TabName;
    if (currentTab && ["banners", "announcements", "sizing"].includes(currentTab)) {
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
            Configure storefront carousel banners, homepage announcement ticks, and custom size profile guides.
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
          <Ruler className="w-4 h-4" />
          Sizing Profiles
        </button>
      </div>

      {/* Active Tab Panel Widget */}
      <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm">
        {activeTab === "banners" && <HeroBannersTab />}
        {activeTab === "announcements" && <AnnouncementsTab />}
        {activeTab === "sizing" && <SizeProfilesTab />}
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
