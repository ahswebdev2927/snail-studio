import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
  ...props
}: PaginationProps) {
  const getPageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 3; // siblings + active + first + last
    const totalBlocks = totalNumbers + 2; // totalNumbers + 2 ellipses

    if (totalPages <= totalBlocks) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "dots", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + 1 + i
      );
      return [firstPageIndex, "dots", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, "dots", ...middleRange, "dots", lastPageIndex];
    }

    return [];
  };

  const pages = getPageNumbers();

  if (totalPages <= 1) return null;

  return (
    <nav
      className={cn("flex items-center justify-center space-x-1.5 py-6 select-none", className)}
      role="navigation"
      aria-label="Pagination Navigation"
      {...props}
    >
      {/* Previous Page Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => page > 1 && onPageChange(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 border border-border/50 bg-background hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Pages list */}
      <div className="flex items-center space-x-1">
        {pages.map((item, idx) => {
          if (item === "dots") {
            return (
              <span
                key={`dots-${idx}`}
                className="w-9 h-9 flex items-center justify-center text-muted-foreground/60"
              >
                <MoreHorizontal className="w-4 h-4" />
              </span>
            );
          }

          const isCurrent = item === page;

          return (
            <Button
              key={`page-${item}`}
              variant={isCurrent ? "default" : "outline"}
              size="icon"
              onClick={() => typeof item === "number" && onPageChange(item)}
              className={cn(
                "w-9 h-9 font-semibold text-xs transition-all cursor-pointer",
                isCurrent
                  ? "bg-primary text-primary-foreground pointer-events-none"
                  : "border border-border/50 bg-background hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
              )}
              aria-label={`Go to page ${item}`}
              aria-current={isCurrent ? "page" : undefined}
            >
              {item}
            </Button>
          );
        })}
      </div>

      {/* Next Page Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => page < totalPages && onPageChange(page + 1)}
        disabled={page === totalPages}
        className="w-9 h-9 border border-border/50 bg-background hover:bg-secondary/40 text-muted-foreground hover:text-foreground cursor-pointer"
        aria-label="Go to next page"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </nav>
  );
}
