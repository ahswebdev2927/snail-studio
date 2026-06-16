import React from "react";
import { Star, ShieldAlert, Check } from "lucide-react";

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Review Moderation Queue</h1>
          <p className="text-xs text-muted-foreground font-light">
            Audit customer product reviews, moderate inappropriate content, and publish items.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-primary/10 text-primary rounded-full">
          <Star className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold tracking-wide">Customer Feedback Moderation</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Verify rating distributions, review descriptions, and attached images before updating store pages.
          </p>
        </div>
      </div>
    </div>
  );
}
