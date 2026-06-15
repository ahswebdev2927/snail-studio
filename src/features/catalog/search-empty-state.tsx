"use client";

import { Sparkles, Trash2 } from "lucide-react";

interface SearchEmptyStateProps {
  onClear: () => void;
  onSearchSuggest: (tag: string) => void;
}

export function SearchEmptyState({ onClear, onSearchSuggest }: SearchEmptyStateProps) {
  const suggestions = ["Matte", "Glossy", "Coffin", "Almond", "French", "Ombre", "Glitter", "Pink", "Nude"];

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-secondary/5 rounded-3xl border border-border/20 max-w-xl mx-auto space-y-6">
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>

      {/* Text */}
      <div className="space-y-2">
        <h3 className="font-serif text-lg font-medium text-foreground">No Products Found</h3>
        <p className="text-sm text-muted-foreground/80 max-w-sm font-light leading-relaxed">
          We couldn't find any press-on nail sets matching your current filters or query. Try adjusting your selections or exploring our popular tags below.
        </p>
      </div>

      {/* Suggestion Tags */}
      <div className="space-y-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold block">
          Popular Search Tags
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm">
          {suggestions.map((tag) => (
            <button
              key={tag}
              onClick={() => onSearchSuggest(tag.toLowerCase())}
              className="text-xs px-3 py-1.5 rounded-full border border-border/30 hover:border-primary/30 hover:text-primary transition-all duration-300 bg-background/50 hover:bg-background cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All Filters
        </button>
      </div>
    </div>
  );
}
