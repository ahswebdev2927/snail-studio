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
    <nav aria-label="Breadcrumb">
      <ol
        className="flex items-center gap-1.5 flex-wrap list-none p-0 m-0"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {/* Home crumb */}
        <li
          itemProp="itemListElement"
          itemScope
          itemType="https://schema.org/ListItem"
          className="flex items-center"
        >
          <Link
            itemProp="item"
            href="/"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center"
            aria-label="Home"
          >
            <Home className="w-3.5 h-3.5" />
            <meta itemProp="name" content="Home" />
          </Link>
          <meta itemProp="position" content="1" />
        </li>

        {/* Dynamic crumbs */}
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          const position = index + 2; // Home is index 1

          return (
            <li
              key={index}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="flex items-center gap-1.5"
            >
              <ChevronRight className="w-3 h-3 text-border shrink-0" aria-hidden="true" />
              {crumb.href && !isLast ? (
                <Link
                  itemProp="item"
                  href={crumb.href}
                  className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                >
                  <span itemProp="name">{crumb.label}</span>
                </Link>
              ) : (
                <span className="flex items-center">
                  <span
                    itemProp="name"
                    className="text-[11px] font-medium text-foreground uppercase tracking-wider"
                    aria-current="page"
                  >
                    {crumb.label}
                  </span>
                  {crumb.href && <meta itemProp="item" content={crumb.href} />}
                </span>
              )}
              <meta itemProp="position" content={position.toString()} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
