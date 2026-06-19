"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Truck, Tag } from "lucide-react";

const announcements = [
  {
    text: "Salon quality press-on nails handcrafted for you",
    icon: Sparkles,
  },
  {
    text: "Free shipping on orders above ₹1,999!",
    icon: Truck,
  },
  {
    text: "Get 10% off your first order! Use code: FIRST10",
    icon: Tag,
  },
];

export function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const ActiveIcon = announcements[index].icon;

  return (
    <div className="w-full bg-primary text-primary-foreground h-9 flex items-center justify-center text-[10px] sm:text-xs font-semibold uppercase tracking-widest relative overflow-hidden select-none border-b border-primary/20">
      <div
        key={index}
        className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300"
      >
        <ActiveIcon className="w-3.5 h-3.5 animate-pulse text-accent" />
        <span>{announcements[index].text}</span>
      </div>
    </div>
  );
}
