import React from "react";

export function CatalogSkeleton() {
  return (
    <div className="flex-1 bg-background text-foreground flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-3 max-w-xl text-center md:text-left">
        <div className="h-10 w-2/3 md:w-1/2 bg-secondary/40 rounded-lg animate-pulse mx-auto md:mx-0" />
        <div className="h-4 w-5/6 md:w-3/4 bg-secondary/30 rounded-md animate-pulse mx-auto md:mx-0" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-border/10">
        <div className="h-11 w-full sm:w-72 bg-secondary/40 rounded-full animate-pulse" />
        <div className="h-11 w-44 bg-secondary/40 rounded-full animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Skeleton (hidden on mobile) */}
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 p-4 border border-border/10 rounded-2xl bg-card">
              <div className="h-4 w-1/2 bg-secondary/40 rounded animate-pulse" />
              <div className="space-y-2 pt-2">
                <div className="h-3.5 w-3/4 bg-secondary/30 rounded animate-pulse" />
                <div className="h-3.5 w-5/6 bg-secondary/30 rounded animate-pulse" />
                <div className="h-3.5 w-2/3 bg-secondary/30 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Results Grid Skeleton */}
        <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-4 bg-card border border-border/30 rounded-2xl p-5 animate-pulse">
              <div className="aspect-square w-full rounded-xl bg-secondary/30" />
              <div className="space-y-3">
                <div className="h-3 bg-secondary/30 rounded w-1/3" />
                <div className="h-5 bg-secondary/30 rounded w-3/4" />
                <div className="h-4 bg-secondary/30 rounded w-1/4" />
                <div className="h-9 bg-secondary/20 rounded-full w-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CatalogSkeleton;
