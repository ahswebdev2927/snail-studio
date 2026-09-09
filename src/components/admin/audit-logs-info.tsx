"use client";

import React, { useState } from "react";
import { Info, Clock } from "lucide-react";

export function AuditLogsInfoIcon({
  text = "Audit logs older than 3 months will be automatically cleared by system (preserving the newest 50 logs) to prevent over storage usage and maintenance cost.",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-1 text-amber-600/90 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 rounded-full transition-all outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
        aria-label="Audit log retention policy info"
        title="Audit log retention policy info"
      >
        <Info className="w-4 h-4" />
      </button>

      {isOpen && (
        <div 
          className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 w-72 p-3.5 bg-card/95 backdrop-blur-md text-card-foreground border border-border/60 rounded-2xl shadow-xl text-xs z-50 animate-fade-in pointer-events-none"
        >
          <div className="flex items-center gap-1.5 font-medium text-[11px] text-foreground mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Audit Log Retention Notice</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-light leading-relaxed">
            {text}
          </p>
        </div>
      )}
    </div>
  );
}

export function AuditLogsInfoBanner({
  text = "Audit logs older than 3 months will be automatically cleared by system (preserving the newest 50 logs) to prevent over storage usage and maintenance cost.",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={`p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center gap-2.5 text-xs font-light leading-relaxed ${className}`}>
      <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>{text}</span>
    </div>
  );
}
