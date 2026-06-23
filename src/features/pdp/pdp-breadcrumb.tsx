import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PdpBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function PdpBreadcrumb({ items }: PdpBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap">
      <Link
        href="/"
        className="text-muted-foreground hover:text-primary transition-colors"
        aria-label="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {items.map((crumb, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-border shrink-0" />
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className="text-[11px] font-medium text-foreground uppercase tracking-wider"
                aria-current="page"
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
