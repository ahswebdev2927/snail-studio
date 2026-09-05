"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, MapPin, Edit2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AddressVerificationModalProps {
  isOpen: boolean;
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    landmark?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  } | null;
  title?: string;
  onConfirm: () => void;
  onEdit: () => void;
  onClose?: () => void;
}

export function AddressVerificationModal({
  isOpen,
  address,
  title = "Verify Delivery Address",
  onConfirm,
  onEdit,
  onClose,
}: AddressVerificationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset countdown to 5 whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      document.body.style.overflow = "hidden";

      return () => {
        clearInterval(timer);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted || !address) return null;

  const formattedLine2 = [address.addressLine2, address.landmark ? `Landmark: ${address.landmark}` : null]
    .filter(Boolean)
    .join(" | ");

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-background/70 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-card border border-border/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative my-auto space-y-0 text-foreground font-sans">
        {/* Top gold accent line */}
        <div className="h-1 bg-gradient-to-r from-primary/30 via-accent to-primary/30" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border/20 flex justify-between items-center bg-secondary/10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent/15 text-accent rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-foreground tracking-wide">{title}</h3>
              <p className="text-[10px] text-muted-foreground font-light">Confirm your details to avoid courier delivery delays.</p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary/30 hover:text-foreground transition-all cursor-pointer bg-transparent border-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Explanation Alert */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300 leading-relaxed font-light">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              Please double-check your recipient name, flat number, pincode, and phone number. Courier partners cannot deliver parcels with incomplete or incorrect addresses.
            </p>
          </div>

          {/* Formatted Address Preview Card */}
          <div className="bg-secondary/20 border border-border/30 rounded-2xl p-4.5 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/20">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                {address.name}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground font-medium">{address.phone}</span>
            </div>

            <div className="text-muted-foreground leading-relaxed font-light space-y-0.5 pt-1">
              <p className="text-foreground font-medium">{address.addressLine1}</p>
              {formattedLine2 && <p>{formattedLine2}</p>}
              <p className="text-foreground font-medium">
                {address.city}, {address.state} - <span className="font-bold text-primary font-mono">{address.postalCode}</span>
              </p>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground/80">{address.country || "India"}</p>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4.5 bg-secondary/15 border-t border-border/20 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={onEdit}
            variant="outline"
            className="flex-1 text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer py-2.5 flex items-center justify-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5 text-primary" />
            Edit Address
          </Button>

          <Button
            type="button"
            disabled={countdown > 0}
            onClick={onConfirm}
            className="flex-1 text-xs font-semibold uppercase tracking-wider rounded-xl cursor-pointer py-2.5 flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {countdown > 0 ? `Confirm Address (${countdown}s)` : "Confirm Address"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
