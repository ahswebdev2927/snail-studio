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
  totalItems?: number;
}

export function FilterDrawer({ isOpen, onClose, facets, filters, onChange, onClear, totalItems }: FilterDrawerProps) {
  // Lock body scroll and listen for Escape key when drawer is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeFiltersCount = 
    (filters.category ? 1 : 0) +
    (filters.brand?.length || 0) +
    (filters.shape?.length || 0) +
    (filters.length?.length || 0) +
    (filters.colour?.length || 0) +
    (filters.texture?.length || 0) +
    (filters.style?.length || 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    (filters.availability ? 1 : 0) +
    (filters.rating ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-start lg:hidden">
      {/* Dark Glass Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Panel (From Left) */}
      <div className="relative w-full max-w-[85vw] sm:max-w-md bg-background shadow-2xl flex flex-col h-full z-10 overscroll-contain transition-transform duration-300 ease-out border-r border-border/30 animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border/40 bg-secondary/10">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-lg font-medium text-foreground">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary-surface transition-all cursor-pointer active:scale-95 touch-manipulation"
            aria-label="Close filters drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filters Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 scrollbar-thin">
          <FilterSidebar
            facets={facets}
            filters={filters}
            onChange={onChange}
            onClear={onClear}
          />
        </div>

        {/* Footer Sticky Actions Bar */}
        <div className="px-5 sm:px-6 py-4 border-t border-border/40 bg-background/95 backdrop-blur-md flex gap-3 shadow-lg">
          <button
            onClick={onClear}
            disabled={activeFiltersCount === 0}
            className={`flex-1 min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-full border border-border/60 transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
              activeFiltersCount > 0
                ? "text-foreground hover:bg-secondary-surface hover:border-border"
                : "text-muted-foreground/40 border-border/20 cursor-not-allowed"
            }`}
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md cursor-pointer touch-manipulation active:scale-[0.98]"
          >
            {totalItems !== undefined ? `View ${totalItems} Result${totalItems === 1 ? "" : "s"}` : "Apply Filters"}
          </button>
        </div>
      </div>
    </div>
  );
}
