"use client";

import { FilterSidebar, FilterState } from "./filter-sidebar";
import { X } from "lucide-react";
import { FacetOption, AttributeFacet } from "@/services/search/product-search.service";
import { useEffect } from "react";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  facets?: {
    categories: FacetOption[];
    brands: FacetOption[];
    attributes: AttributeFacet[];
    priceRange: { min: number; max: number };
  };
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
}

export function FilterDrawer({ isOpen, onClose, facets, filters, onChange, onClear }: FilterDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Dark Glass Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-background shadow-xl flex flex-col h-full z-10 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <span className="font-serif text-lg font-medium text-foreground">Filters</span>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary-surface transition-all cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filters Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <FilterSidebar
            facets={facets}
            filters={filters}
            onChange={onChange}
            onClear={onClear}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border/40 bg-secondary/10 flex gap-3">
          <button
            onClick={onClear}
            className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider rounded-full border border-border hover:bg-secondary-surface transition-colors cursor-pointer"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-colors cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
