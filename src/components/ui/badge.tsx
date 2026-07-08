import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary:
          "border-transparent bg-secondary-surface text-text-body border border-border-light",
        destructive:
          "border-transparent bg-error/10 text-error border border-error/20",
        outline: "text-text-body border-border",
        accent: "border-transparent bg-accent text-accent-foreground shadow-xs",
        success: "border-transparent bg-success/20 text-text-heading border border-success/30",
        sale: "border-transparent bg-primary text-primary-foreground shadow-xs",
        newArrival: "border-transparent bg-primary-light text-text-heading shadow-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
