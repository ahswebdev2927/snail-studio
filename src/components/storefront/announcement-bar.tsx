"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Truck,
  Tag,
  Gift,
  Star,
  Percent,
  ShoppingBag,
  Info,
  ShieldCheck,
  X
} from "lucide-react";

interface DBAnnouncement {
  id: string;
  text: string;
  icon: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  textColor: string;
  backgroundColor: string;
}

interface BarSettings {
  displayMode: "rotation" | "marquee" | "static";
  marqueeSpeed: "slow" | "normal" | "fast";
  showCloseButton: boolean;
  isSticky: boolean;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  sparkles: Sparkles,
  truck: Truck,
  tag: Tag,
  gift: Gift,
  star: Star,
  percent: Percent,
  shoppingBag: ShoppingBag,
  info: Info,
  shieldCheck: ShieldCheck,
};

const marqueeSpeedMap = {
  slow: "35s",
  normal: "20s",
  fast: "10s",
};

export function AnnouncementBar({
  announcements = [],
  settings = null
}: {
  announcements: DBAnnouncement[];
  settings: BarSettings | null;
}) {
  const pathname = usePathname();

  const activeSettings: BarSettings = {
    displayMode: settings?.displayMode || "rotation",
    marqueeSpeed: settings?.marqueeSpeed || "normal",
    showCloseButton: settings?.showCloseButton !== undefined ? settings.showCloseButton : true,
    isSticky: settings?.isSticky || false,
  };

  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(true); // Default to true to prevent hydration layout shift

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = sessionStorage.getItem("announcement-dismissed") === "true";
      setDismissed(isDismissed);
    }
  }, []);

  // Update CSS custom property for sticky header shifting
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStickyActive = activeSettings.isSticky && !dismissed && announcements.length > 0 && pathname === "/";
    
    if (isStickyActive) {
      document.documentElement.style.setProperty("--announcement-bar-height", "44px");
    } else {
      document.documentElement.style.setProperty("--announcement-bar-height", "0px");
    }
    
    return () => {
      document.documentElement.style.setProperty("--announcement-bar-height", "0px");
    };
  }, [activeSettings.isSticky, dismissed, announcements.length, pathname]);

  // Rotation slider interval
  useEffect(() => {
    if (activeSettings.displayMode !== "rotation" || announcements.length <= 1) return;
    
    const timer = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % announcements.length);
    }, 4500);
    
    return () => clearInterval(timer);
  }, [announcements.length, activeSettings.displayMode]);

  if (pathname !== "/" || dismissed || announcements.length === 0) {
    return null;
  }

  const current = announcements[index] || announcements[0];
  const barBackground = current?.backgroundColor || "#A85328";
  const barText = current?.textColor || "#ffffff";

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("announcement-dismissed", "true");
    }
  };

  // 1. Marquee Ticker Render
  if (activeSettings.displayMode === "marquee") {
    const duration = marqueeSpeedMap[activeSettings.marqueeSpeed] || "20s";
    
    // Repeat announcements to guarantee the track width exceeds screen width (seamless infinite scrolling)
    const repeatedAnnouncements: DBAnnouncement[] = [];
    const repetitions = announcements.length === 1 ? 12 : announcements.length === 2 ? 6 : announcements.length === 3 ? 4 : 3;
    for (let i = 0; i < repetitions; i++) {
      repeatedAnnouncements.push(...announcements);
    }
    
    const Track = ({ suffix }: { suffix: string }) => (
      <div className="flex gap-16 items-center shrink-0 pr-16">
        {repeatedAnnouncements.map((ann, idx) => {
          const ActiveIcon = ann.icon ? iconMap[ann.icon.toLowerCase()] : null;
          
          return (
            <div key={`${ann.id}-${idx}-${suffix}`} className="flex items-center gap-2 font-semibold">
              {ActiveIcon && (
                <ActiveIcon className="w-3.5 h-3.5 shrink-0 text-accent animate-pulse" />
              )}
              {ann.ctaLink ? (
                <Link
                  href={ann.ctaLink}
                  className="hover:opacity-90 hover:underline transition-opacity"
                >
                  <span dangerouslySetInnerHTML={{ __html: ann.text }} />
                </Link>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: ann.text }} />
              )}
              {ann.ctaText && ann.ctaLink && (
                <Link
                  href={ann.ctaLink}
                  className="underline hover:opacity-85 transition-opacity font-bold ml-1 text-[9px] sm:text-[10px]"
                >
                  {ann.ctaText}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    );

    return (
      <div
        style={{
          backgroundColor: barBackground,
          color: barText,
          borderColor: `${barText}20`
        }}
        className={`w-full h-11 flex items-center justify-between text-[10px] sm:text-xs uppercase tracking-widest relative overflow-hidden select-none border-b transition-all duration-300 ${
          activeSettings.isSticky ? "sticky top-0 z-50" : ""
        }`}
      >
        {/* Dynamic style block to keep CSS self-contained */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes marquee-scroll {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .animate-marquee-scroll {
              animation: marquee-scroll ${duration} linear infinite;
            }
            .animate-marquee-scroll:hover {
              animation-play-state: paused;
            }
            header.sticky {
              top: var(--announcement-bar-height, 0px) !important;
              transition: top 0.2s ease-in-out;
            }
          `
        }} />

        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex w-max animate-marquee-scroll">
            <Track suffix="1" />
            <Track suffix="2" />
          </div>
        </div>

        {activeSettings.showCloseButton && (
          <button
            onClick={handleDismiss}
            className="absolute right-3 p-1 hover:opacity-70 transition-opacity cursor-pointer rounded-full focus:outline-none flex items-center justify-center bg-inherit z-10"
            aria-label="Dismiss announcement"
            style={{ color: barText }}
          >
            <X className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}
      </div>
    );
  }

  // 2. Static Mode Render
  if (activeSettings.displayMode === "static") {
    const staticAnn = announcements[0];
    const StaticIcon = staticAnn.icon ? iconMap[staticAnn.icon.toLowerCase()] : null;
    
    return (
      <div
        style={{
          backgroundColor: staticAnn.backgroundColor,
          color: staticAnn.textColor,
          borderColor: `${staticAnn.textColor}20`
        }}
        className={`w-full h-11 flex items-center justify-center text-[10px] sm:text-xs uppercase tracking-widest relative overflow-hidden select-none border-b transition-colors duration-300 ${
          activeSettings.isSticky ? "sticky top-0 z-50" : ""
        }`}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            header.sticky {
              top: var(--announcement-bar-height, 0px) !important;
              transition: top 0.2s ease-in-out;
            }
          `
        }} />
        
        <div className="flex items-center justify-center gap-2 truncate px-8 leading-none">
          {StaticIcon && (
            <StaticIcon className="w-3.5 h-3.5 animate-pulse shrink-0 text-accent" />
          )}
          {staticAnn.ctaLink ? (
            <Link
              href={staticAnn.ctaLink}
              className="hover:opacity-90 hover:underline flex items-center gap-1.5"
            >
              <span className="font-semibold select-none truncate" dangerouslySetInnerHTML={{ __html: staticAnn.text }} />
              {staticAnn.ctaText && (
                <span className="underline hover:opacity-85 font-bold text-[9px] sm:text-[10px] shrink-0 uppercase tracking-wider">
                  {staticAnn.ctaText}
                </span>
              )}
            </Link>
          ) : (
            <>
              <span className="font-semibold select-none truncate" dangerouslySetInnerHTML={{ __html: staticAnn.text }} />
              {staticAnn.ctaText && staticAnn.ctaLink && (
                <Link
                  href={staticAnn.ctaLink}
                  className="underline hover:opacity-85 font-bold text-[9px] sm:text-[10px] shrink-0 uppercase tracking-wider ml-1"
                >
                  {staticAnn.ctaText}
                </Link>
              )}
            </>
          )}
        </div>

        {activeSettings.showCloseButton && (
          <button
            onClick={handleDismiss}
            className="absolute right-3 p-1 hover:opacity-70 transition-opacity cursor-pointer rounded-full focus:outline-none flex items-center justify-center"
            aria-label="Dismiss announcement"
            style={{ color: staticAnn.textColor }}
          >
            <X className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}
      </div>
    );
  }

  // 3. Rotation Slider Mode Render (Default)
  const ActiveIcon = current.icon ? iconMap[current.icon.toLowerCase()] : null;

  const barContent = (
    <div className="flex items-center justify-center gap-2 truncate px-8 leading-none">
      {ActiveIcon && (
        <ActiveIcon className="w-3.5 h-3.5 animate-pulse shrink-0 text-accent" />
      )}
      <span
        className="font-semibold select-none truncate flex items-center gap-1.5"
        dangerouslySetInnerHTML={{ __html: current.text }}
      />
      {current.ctaText && current.ctaLink && (
        <span className="underline ml-1 hover:opacity-85 transition-opacity font-bold text-[9px] sm:text-[10px] shrink-0 uppercase tracking-wider">
          {current.ctaText}
        </span>
      )}
    </div>
  );

  return (
    <div
      style={{
        backgroundColor: barBackground,
        color: barText,
        borderColor: `${barText}20`
      }}
      className={`w-full h-11 flex items-center justify-center text-[10px] sm:text-xs uppercase tracking-widest relative overflow-hidden select-none border-b transition-colors duration-300 ${
        activeSettings.isSticky ? "sticky top-0 z-50" : ""
      }`}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          header.sticky {
            top: var(--announcement-bar-height, 0px) !important;
            transition: top 0.2s ease-in-out;
          }
        `
      }} />

      <div key={index} className="w-full h-full flex items-center justify-center animate-in fade-in slide-in-from-top-1 duration-300">
        {current.ctaLink ? (
          <Link
            href={current.ctaLink}
            className="w-full h-full flex items-center justify-center hover:opacity-90"
          >
            {barContent}
          </Link>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {barContent}
          </div>
        )}
      </div>

      {activeSettings.showCloseButton && (
        <button
          onClick={handleDismiss}
          className="absolute right-3 p-1 hover:opacity-70 transition-opacity cursor-pointer rounded-full focus:outline-none flex items-center justify-center z-10"
          aria-label="Dismiss announcement"
          style={{ color: barText }}
        >
          <X className="w-3.5 h-3.5 shrink-0" />
        </button>
      )}
    </div>
  );
}
