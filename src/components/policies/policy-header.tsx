import React from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PolicyHeaderProps {
  title: string;
  badge?: string;
  description?: string;
  lastUpdated: string;
}

export function PolicyHeader({ title, badge = "Official Policy", description, lastUpdated }: PolicyHeaderProps) {
  return (
    <div className="space-y-4 pb-8 border-b border-border/40">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest px-3 py-1 font-semibold border-primary/30 text-primary bg-primary/5">
          <ShieldCheck className="w-3 h-3 mr-1" />
          {badge}
        </Badge>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-light">
          <Clock className="w-3.5 h-3.5" />
          <span>Effective: {lastUpdated}</span>
        </div>
      </div>

      <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-wide text-foreground leading-tight">
        {title}
      </h1>

      {description && (
        <p className="text-sm sm:text-base text-muted-foreground font-light max-w-3xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
