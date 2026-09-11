"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, RotateCcw, RefreshCw } from "lucide-react";
import { CustomerReturnTimeline } from "./customer-return-timeline";

interface CustomerReturnTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  storePhone?: string;
}

export default function CustomerReturnTimelineModal({
  isOpen,
  onClose,
  request,
  storePhone,
}: CustomerReturnTimelineModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background border border-border/40 rounded-3xl shadow-2xl z-10 animate-in zoom-in-95 duration-200 p-6 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/20">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              {request.type === "RETURN" ? <RotateCcw className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">
                {request.type === "RETURN" ? "Return Request Status & Timeline" : "Replacement Request Status & Timeline"}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                Request ID: {request.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="pt-2">
          <CustomerReturnTimeline request={request} storePhone={storePhone} />
        </div>
      </div>
    </div>,
    document.body
  );
}
