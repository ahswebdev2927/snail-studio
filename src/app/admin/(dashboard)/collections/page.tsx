import React from "react";
import { FolderHeart, Plus } from "lucide-react";

export default function AdminCollectionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Category & Collection Compilers</h1>
          <p className="text-xs text-muted-foreground font-light">
            Manage product collections, banner layouts, and auto-compilation rule parameters.
          </p>
        </div>
        <div>
          <button className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Collection
          </button>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-primary/10 text-primary rounded-full">
          <FolderHeart className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold tracking-wide">Category Hierarchy & Compilation Rules</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Configure dynamic tags (e.g. Shape equals 'Coffin') or manual layouts for category grids.
          </p>
        </div>
      </div>
    </div>
  );
}
