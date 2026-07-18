"use client";

import React, { useState, useEffect } from "react";

interface CountdownTimerProps {
  launchDate: string; // "YYYY-MM-DD"
  launchTime: string; // "HH:MM"
  onExpire?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function CountdownTimer({
  launchDate,
  launchTime,
  onExpire,
  className = "",
  size = "md"
}: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    setMounted(true);

    const calculateTimeLeft = () => {
      // India Standard Time (IST) is UTC+5:30
      const targetStr = `${launchDate}T${launchTime || "00:00"}:00+05:30`;
      const targetDate = new Date(targetStr);
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false
      };
    };

    // Initial check
    const initial = calculateTimeLeft();
    setTimeLeft(initial);
    if (initial.isExpired && onExpire) {
      onExpire();
    }

    const timer = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);
      if (updated.isExpired) {
        clearInterval(timer);
        if (onExpire) {
          onExpire();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [launchDate, launchTime, onExpire]);

  if (!mounted) {
    // Return a skeleton structure with the same layout to avoid layout shift
    return (
      <div className={`flex items-center gap-3.5 ${className}`}>
        {["DAYS", "HRS", "MINS", "SECS"].map((label) => (
          <div key={label} className="text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary/20 border border-border/10 flex items-center justify-center animate-pulse" />
            <span className="text-[9px] text-muted-foreground/40 font-bold tracking-wider mt-1 block">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className={`text-xs font-semibold tracking-wider text-primary px-3.5 py-1 bg-primary/5 rounded-full border border-primary/10 ${className}`}>
        LAUNCHED
      </div>
    );
  }

  const sizeClasses = {
    sm: {
      box: "w-11 h-11 rounded-lg text-sm",
      label: "text-[8px] mt-0.5",
      gap: "gap-2"
    },
    md: {
      box: "w-14 h-14 rounded-xl text-lg",
      label: "text-[9px] mt-1.5",
      gap: "gap-3"
    },
    lg: {
      box: "w-20 h-20 rounded-2xl text-3xl",
      label: "text-[11px] mt-2",
      gap: "gap-4.5"
    }
  }[size];

  const padZero = (num: number) => String(num).padStart(2, "0");

  const timeItems = [
    { value: timeLeft.days, label: "DAYS" },
    { value: timeLeft.hours, label: "HRS" },
    { value: timeLeft.minutes, label: "MINS" },
    { value: timeLeft.seconds, label: "SECS" }
  ];

  return (
    <div className={`flex items-center ${sizeClasses.gap} ${className}`}>
      {timeItems.map((item, idx) => (
        <div key={item.label} className="flex items-center">
          <div className="text-center">
            <div
              className={`flex items-center justify-center font-bold border border-stone-800/80 bg-stone-900/95 text-amber-100 dark:text-amber-100 backdrop-blur-md font-mono shadow-md transition-all hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.05)] duration-300 ${sizeClasses.box}`}
            >
              {padZero(item.value)}
            </div>
            <span className={`font-bold tracking-widest text-stone-500 block uppercase ${sizeClasses.label}`}>
              {item.label}
            </span>
          </div>
          {idx < 3 && (
            <span className={`text-amber-500/30 font-light ml-2 animate-pulse ${size === "lg" ? "text-2xl mt-[-20px]" : "text-sm mt-[-10px]"}`}>
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
