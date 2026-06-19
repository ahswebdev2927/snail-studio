import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  className?: string;
  closeOnOverlayClick?: boolean;
}

export function Drawer({
  isOpen,
  onClose,
  children,
  side = "right",
  className,
  closeOnOverlayClick = true,
}: DrawerProps) {
  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Slide animations & positioning styles based on 'side'
  const sideStyles = {
    left: "left-0 top-0 bottom-0 w-80 max-w-[85vw] border-r animate-in slide-in-from-left duration-300",
    right: "right-0 top-0 bottom-0 w-96 max-w-[90vw] border-l animate-in slide-in-from-right duration-300",
    top: "top-0 left-0 right-0 h-80 border-b animate-in slide-in-from-top duration-300",
    bottom: "bottom-0 left-0 right-0 max-h-[80vh] border-t rounded-t-[2.5rem] animate-in slide-in-from-bottom duration-300",
  };

  return (
    <div className="fixed inset-0 z-100 flex overflow-hidden">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={() => closeOnOverlayClick && onClose()}
      />

      {/* Drawer Panel Container */}
      <div
        className={cn(
          "fixed bg-card border-border/40 shadow-2xl flex flex-col h-full focus:outline-hidden",
          sideStyles[side],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 cursor-pointer z-10"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>

        {children}
      </div>
    </div>
  );
}

export function DrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 p-6 border-b border-border/10",
        className
      )}
      {...props}
    />
  );
}

export function DrawerTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-serif text-lg font-normal leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function DrawerDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-muted-foreground font-light leading-relaxed", className)}
      {...props}
    />
  );
}

export function DrawerBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto p-6 space-y-4", className)}
      {...props}
    />
  );
}

export function DrawerFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "p-6 border-t border-border/10 bg-secondary/10 flex flex-col gap-2 mt-auto",
        className
      )}
      {...props}
    />
  );
}
