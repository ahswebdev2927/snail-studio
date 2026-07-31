import React from "react";

export default function StorefrontLoading() {
  return (
    <div className="w-full min-h-screen bg-background flex flex-col">
      {/* 1. Hero Banner Placeholder */}
      <div className="relative w-full h-[600px] lg:h-[700px] bg-secondary/5 overflow-hidden flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 space-y-6">
          {/* Sparkle badge skeleton */}
          <div className="h-6 w-36 bg-secondary/15 rounded-full animate-pulse" />
          {/* Main Title skeleton */}
          <div className="space-y-3">
            <div className="h-10 w-3/4 sm:w-2/3 lg:w-1/2 bg-secondary/15 rounded-2xl animate-pulse" />
            <div className="h-10 w-1/2 sm:w-1/3 bg-secondary/15 rounded-2xl animate-pulse" />
          </div>
          {/* Subtitle skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-5/6 sm:w-2/3 lg:w-1/2 bg-secondary/10 rounded-lg animate-pulse" />
            <div className="h-4 w-2/3 sm:w-1/2 bg-secondary/10 rounded-lg animate-pulse" />
          </div>
          {/* Button skeleton */}
          <div className="h-12 w-44 bg-secondary/15 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 2. Featured Collections Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full space-y-8">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-4 w-24 bg-primary/10 rounded-full animate-pulse" />
          <div className="h-8 w-64 bg-secondary/15 rounded-xl animate-pulse" />
          <div className="h-4 w-96 bg-secondary/10 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border/30 rounded-3xl overflow-hidden shadow-sm space-y-4 p-4">
              {/* Collection Image */}
              <div className="aspect-[4/3] w-full rounded-2xl bg-secondary/10 animate-pulse" />
              {/* Title & Stats */}
              <div className="space-y-2 px-2">
                <div className="h-5 w-2/3 bg-secondary/15 rounded-lg animate-pulse" />
                <div className="h-3 w-1/3 bg-secondary/10 rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Featured Categories Shelf Skeleton */}
      <div className="bg-secondary/5 py-16 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-secondary/15 rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-secondary/10 rounded-md animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-secondary/15 rounded-lg animate-pulse" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-border/20 rounded-2xl p-4 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-secondary/10 animate-pulse" />
                <div className="h-4 w-24 bg-secondary/15 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
