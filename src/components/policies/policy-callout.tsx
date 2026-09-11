import React from "react";
import { Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PolicyCalloutProps {
  type?: "info" | "warning" | "important";
  title: string;
  text: string;
  className?: string;
}

export function PolicyCallout({ type = "info", title, text, className }: PolicyCalloutProps) {
  const isWarning = type === "warning";
  const isImportant = type === "important";

  return (
    <div
      className={cn(
        "p-5 rounded-2xl border transition-colors my-4 text-xs font-sans",
        isImportant
          ? "bg-rose-500/5 border-rose-500/20 text-foreground"
          : isWarning
          ? "bg-amber-500/5 border-amber-500/20 text-foreground"
          : "bg-secondary/30 border-border/40 text-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        {isImportant ? (
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
        ) : isWarning ? (
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        ) : (
          <Info className="w-4 h-4 text-primary shrink-0" />
        )}
        <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">{title}</h4>
      </div>
      <p className="text-muted-foreground font-light leading-relaxed pl-6.5">{text}</p>
    </div>
  );
}
