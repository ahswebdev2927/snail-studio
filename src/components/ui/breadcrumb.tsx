import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
}

export function Breadcrumb({ items, showHomeIcon = true, className, ...props }: BreadcrumbProps) {
  return (
    <nav
      className={cn("flex items-center space-x-1.5 text-xs text-muted-foreground font-light select-none", className)}
      aria-label="Breadcrumb"
      {...props}
    >
      {showHomeIcon && (
        <>
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-primary transition-colors py-1 px-1.5 rounded-md hover:bg-secondary/40"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Home</span>
          </Link>
          {items.length > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-primary transition-colors py-1 px-1.5 rounded-md hover:bg-secondary/40 whitespace-nowrap"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-normal text-foreground py-1 px-1.5 whitespace-nowrap" aria-current="page">
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
