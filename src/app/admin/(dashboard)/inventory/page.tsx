import React from "react";
import { Boxes, History, ArrowRight } from "lucide-react";

export default function AdminInventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Inventory Center</h1>
          <p className="text-xs text-muted-foreground font-light">
            Monitor real-time physical stock levels, manage reservations, and trace manual adjustments.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary hover:bg-muted border border-border text-foreground rounded-xl text-xs font-medium transition-all cursor-pointer">
            <History className="w-4 h-4 text-muted-foreground" />
            Adjustment Logs
          </button>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-accent/10 text-accent rounded-full">
          <Boxes className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold tracking-wide">Stock Management Hub</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Relational variant stock levels, warehouse auditing, and low stock alert thresholds. Ready to compile inventory tables.
          </p>
        </div>
      </div>
    </div>
  );
}
