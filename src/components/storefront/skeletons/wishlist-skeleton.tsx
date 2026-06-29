import React from "react";

export function WishlistSkeleton() {
  return (
    <div className="flex-1 bg-background text-foreground max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 w-32 bg-secondary/40 rounded-md animate-pulse" />

      {/* Title Skeleton */}
      <div className="space-y-2">
        <div className="h-10 w-48 bg-secondary/40 rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-secondary/40 rounded-md animate-pulse" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
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
  );
}

export default WishlistSkeleton;
