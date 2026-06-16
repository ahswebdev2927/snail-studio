import React from "react";
import { ClipboardList, Filter, Download } from "lucide-react";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Order Manager</h1>
          <p className="text-xs text-muted-foreground font-light">
            Track customer orders, process shipping labels, verify payments, and handle refunds.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary hover:bg-muted border border-border text-foreground rounded-xl text-xs font-medium transition-all cursor-pointer">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Filters
          </button>
          <button className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary hover:bg-muted border border-border text-foreground rounded-xl text-xs font-medium transition-all cursor-pointer">
            <Download className="w-4 h-4 text-muted-foreground" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-primary/10 text-primary rounded-full">
          <ClipboardList className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold tracking-wide">Fulfillment Workflow</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Transition order states, configure parcel labels, and issue email tracking links automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
