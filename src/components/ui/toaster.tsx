"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border/70 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:font-sans",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs font-light mt-1",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl font-medium",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:rounded-xl font-medium",
          success:
            "group-[.toaster]:bg-emerald-50 dark:group-[.toaster]:bg-emerald-950/80 group-[.toaster]:text-emerald-950 dark:group-[.toaster]:text-emerald-100 group-[.toaster]:border-emerald-300 dark:group-[.toaster]:border-emerald-800",
          error:
            "group-[.toaster]:bg-rose-50 dark:group-[.toaster]:bg-rose-950/80 group-[.toaster]:text-rose-950 dark:group-[.toaster]:text-rose-100 group-[.toaster]:border-rose-300 dark:group-[.toaster]:border-rose-800",
          warning:
            "group-[.toaster]:bg-amber-50 dark:group-[.toaster]:bg-amber-950/80 group-[.toaster]:text-amber-950 dark:group-[.toaster]:text-amber-100 group-[.toaster]:border-amber-300 dark:group-[.toaster]:border-amber-800",
          info:
            "group-[.toaster]:bg-orange-50 dark:group-[.toaster]:bg-orange-950/80 group-[.toaster]:text-orange-950 dark:group-[.toaster]:text-orange-100 group-[.toaster]:border-orange-300 dark:group-[.toaster]:border-orange-800",
        },
      }}
      {...props}
    />
  );
}
