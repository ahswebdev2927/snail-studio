import React from "react";
import { Search, RotateCw } from "lucide-react";

export default function AdminSearchSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Search Indexes Configuration</h1>
          <p className="text-xs text-muted-foreground font-light">
            Manage Meilisearch server settings and trigger indexing catalogs.
          </p>
        </div>
        <div>
          <button className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer">
            <RotateCw className="w-4 h-4" />
            Rebuild Index
          </button>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Meilisearch Host</label>
            <input type="text" placeholder="https://edge-meili.snailstudio.com" className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Meilisearch API Key</label>
            <input type="password" placeholder="••••••••••••" className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
