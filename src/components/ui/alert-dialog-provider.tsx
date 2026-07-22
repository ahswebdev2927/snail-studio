"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AlertDialogConfig {
  title: string;
  message: string;
  type: "alert" | "confirm";
  cancelText?: string;
  continueText?: string;
  resolve: (value: boolean) => void;
}

interface AlertDialogContextType {
  alert: (title: string, message: string) => Promise<void>;
  confirm: (title: string, message: string, options?: { cancelText?: string; continueText?: string }) => Promise<boolean>;
}

const AlertDialogContext = createContext<AlertDialogContextType | null>(null);

let globalConfirmRef: ((title: string, message: string, options?: { cancelText?: string; continueText?: string }) => Promise<boolean>) | null = null;
let globalAlertRef: ((title: string, message: string) => Promise<void>) | null = null;

export function AlertDialogProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AlertDialogConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const alert = useCallback((title: string, message: string): Promise<void> => {
    return new Promise((resolve) => {
      setConfig({
        title,
        message,
        type: "alert",
        continueText: "OK",
        resolve: () => {
          setIsOpen(false);
          setTimeout(() => {
            setIsRendered(false);
            setConfig(null);
          }, 200);
          resolve();
        },
      });
      setIsRendered(true);
      setTimeout(() => setIsOpen(true), 10);
    });
  }, []);

  const confirm = useCallback(
    (
      title: string,
      message: string,
      options?: { cancelText?: string; continueText?: string }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfig({
          title,
          message,
          type: "confirm",
          cancelText: options?.cancelText || "Cancel",
          continueText: options?.continueText || "Continue",
          resolve: (value: boolean) => {
            setIsOpen(false);
            setTimeout(() => {
              setIsRendered(false);
              setConfig(null);
            }, 200);
            resolve(value);
          },
        });
        setIsRendered(true);
        setTimeout(() => setIsOpen(true), 10);
      });
    },
    []
  );

  React.useEffect(() => {
    globalConfirmRef = confirm;
    globalAlertRef = alert;
    return () => {
      globalConfirmRef = null;
      globalAlertRef = null;
    };
  }, [confirm, alert]);

  // Lock body scroll when dialog is active
  React.useEffect(() => {
    if (isRendered) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRendered]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && config) {
        if (config.type === "confirm") {
          config.resolve(false);
        } else {
          config.resolve(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, config]);

  return (
    <AlertDialogContext.Provider value={{ alert, confirm }}>
      {children}
      {isMounted && isRendered && config &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <div
              className={cn(
                "fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-200 ease-out",
                isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onClick={() => {
                if (config.type === "confirm") {
                  config.resolve(false);
                } else {
                  config.resolve(true);
                }
              }}
            />

            {/* Dialog Container */}
            <div
              className={cn(
                "relative z-10 w-full max-w-[440px] overflow-hidden rounded-[20px] bg-card border border-border/60 shadow-2xl transition-all duration-200 ease-out flex flex-col my-auto",
                isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none"
              )}
              role="alertdialog"
              aria-modal="true"
            >
              {/* Header content */}
              <div className="p-6 text-left">
                <h2 className="text-text-heading font-semibold text-lg tracking-tight font-sans">
                  {config.title}
                </h2>
                <p className="text-text-body/90 text-sm font-light leading-relaxed mt-2.5 font-sans">
                  {config.message}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-border/40" />

              {/* Actions Footer */}
              <div className="px-6 py-4 flex justify-end gap-2 bg-secondary-surface/40">
                {config.type === "confirm" && (
                  <button
                    onClick={() => config.resolve(false)}
                    className="px-4 py-2 rounded-xl bg-transparent border border-border-strong/50 text-foreground hover:bg-secondary-surface/80 transition-all text-sm font-medium cursor-pointer"
                  >
                    {config.cancelText}
                  </button>
                )}
                <button
                  onClick={() => config.resolve(true)}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active transition-all text-sm font-medium cursor-pointer"
                >
                  {config.continueText}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AlertDialogContext.Provider>
  );
}

export function useAlertDialog() {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error("useAlertDialog must be used within an AlertDialogProvider");
  }
  return context;
}

export const customConfirm = (
  title: string,
  message: string,
  options?: { cancelText?: string; continueText?: string }
): Promise<boolean> => {
  if (globalConfirmRef) {
    return globalConfirmRef(title, message, options);
  }
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
};

export const customAlert = (title: string, message: string): Promise<void> => {
  const lowerTitle = title?.toLowerCase() || "";
  const options = { description: message, position: "bottom-right" as const };

  if (lowerTitle.includes("error") || lowerTitle.includes("fail") || lowerTitle.includes("limit")) {
    toast.error(title, options);
  } else if (
    lowerTitle.includes("success") ||
    lowerTitle.includes("complete") ||
    lowerTitle.includes("saved") ||
    lowerTitle.includes("created") ||
    lowerTitle.includes("updated")
  ) {
    toast.success(title, options);
  } else if (lowerTitle.includes("warning") || lowerTitle.includes("caution")) {
    toast.warning(title, options);
  } else {
    toast.info(title, options);
  }

  return Promise.resolve();
};
