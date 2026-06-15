"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface SearchPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function SearchPagination({ page, totalPages, onPageChange }: SearchPaginationProps) {
  if (totalPages <= 1) return null;

  // Compute page array
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      {/* Prev button */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-full border border-border/40 hover:bg-secondary/40 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Pages list */}
      {pages.map((p) => {
        const isCurrent = p === page;
        return (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 text-xs rounded-full font-semibold transition-all duration-300 cursor-pointer ${
              isCurrent
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border/40 hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </button>
        );
      })}

      {/* Next button */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-full border border-border/40 hover:bg-secondary/40 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
