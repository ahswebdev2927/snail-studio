"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  closeOnOverlayClick = true,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
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

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={() => closeOnOverlayClick && onClose()}
      />

      {/* Modal Dialog Content */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-card border border-border/40 p-6 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 flex flex-col max-h-[85vh] my-auto",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {children}
      </div>
    </div>,
    document.body
  );
}


export function ModalHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left mb-4",
        className
      )}
      {...props}
    />
  );
}

export function ModalTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-serif text-xl font-normal leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function ModalDescription({
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

export function ModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6",
        className
      )}
      {...props}
    />
  );
}
