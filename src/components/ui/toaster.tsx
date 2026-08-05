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
          success: "success",
          error: "error",
          warning: "warning",
          info: "info",
        },
      }}
      {...props}
    />
  );
}
