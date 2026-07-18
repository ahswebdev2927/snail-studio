"use client";

import React, { useState, useEffect, useRef } from "react";
import { KeyRound, ShieldAlert, Loader2, X, CheckCircle2 } from "lucide-react";

interface OtpVerificationModalProps {
  isOpen: boolean;
  actionName: string;
  devOtp?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OtpVerificationModal({
  isOpen,
  actionName,
  devOtp,
  onClose,
  onSuccess,
}: OtpVerificationModalProps) {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setOtp(new Array(6).fill(""));
      setError(null);
      setIsVerifying(false);
      setIsSuccess(false);
      // Focus first input box
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    const value = element.value;
    if (isNaN(Number(value))) return; // numeric check

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input box
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        // Focus previous input box on backspace if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (pastedData.length !== 6 || isNaN(Number(pastedData))) return;

    const newOtp = pastedData.split("");
    setOtp(newOtp);

    // Focus last input box
    inputRefs.current[5]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/security/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        const data = await res.json();
        setError(data.error || "Verification failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("A connection error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Map backend action names to friendly readable names
  const getActionFriendlyName = (name: string) => {
    const map: Record<string, string> = {
      promote_admin: "Promoting user to Admin role",
      demote_admin: "Demoting administrator to Customer role",
      delete_product: "Deleting a product permanently",
      delete_category: "Deleting a category",
      delete_collection: "Deleting a collection",
      cancel_order: "Cancelling an order",
      refund_order: "Refunding an order payment",
      cancel_shipment: "Cancelling active parcel shipment",
      refund_difference: "Refunding shipping cost difference",
      change_smtp_configuration: "Updating SMTP/Resend configurations",
      change_payment_keys: "Updating Razorpay Payment configurations",
      change_store_settings: "Updating general store configurations",
      export_customers: "Exporting Customer Database profile data",
      export_logs: "Exporting System and Access Audit logs",
    };
    return map[name] || `Performing privileged action: ${name}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-md px-4 animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-card border border-border/60 rounded-3xl p-8 shadow-2xl overflow-hidden transition-all duration-300 transform scale-100">
        
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

        {/* Header Close button */}
        {!isVerifying && !isSuccess && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Top Security Icon */}
          <div className={`p-4 rounded-2xl transition-all duration-300 ${
            isSuccess 
              ? "bg-green-500/10 text-green-500 scale-110" 
              : error 
                ? "bg-destructive/10 text-destructive animate-shake" 
                : "bg-primary/10 text-primary"
          }`}>
            {isSuccess ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <KeyRound className="w-8 h-8" />
            )}
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-semibold tracking-wide text-foreground">
              {isSuccess ? "Identity Verified" : "Security Verification Required"}
            </h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto font-light leading-relaxed">
              {isSuccess 
                ? "Authorization successful. Proceeding with action..." 
                : `Enter the 6-digit security code sent to your email to authorize:`
              }
            </p>
            {!isSuccess && (
              <div className="inline-block mt-2 px-3 py-1 bg-secondary/30 text-secondary-foreground text-[10px] font-semibold tracking-wider uppercase rounded-full border border-secondary/50">
                {getActionFriendlyName(actionName)}
              </div>
            )}
            {devOtp && !isSuccess && (
              <div 
                onClick={() => {
                  if (devOtp.length === 6) {
                    setOtp(devOtp.split(""));
                  }
                }}
                className="mt-3 px-4 py-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-[10px] font-bold rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-1.5 animate-pulse"
              >
                <span>[Dev Mode] Click to autofill: <strong>{devOtp}</strong></span>
              </div>
            )}
          </div>

          {/* OTP Input Fields */}
          {!isSuccess && (
            <form onSubmit={handleVerify} className="w-full space-y-6">
              <div 
                className="flex justify-between max-w-xs mx-auto gap-2"
                onPaste={handlePaste}
              >
                {otp.map((data, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    value={data}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    disabled={isVerifying}
                    className="w-12 h-14 bg-secondary/20 dark:bg-secondary/10 border border-border/60 focus:border-primary text-center text-xl font-mono font-bold rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                ))}
              </div>

              {/* Error display */}
              {error && (
                <div className="flex items-center justify-center gap-2 p-3 text-xs bg-destructive/10 text-destructive rounded-xl border border-destructive/20 max-w-xs mx-auto">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Verify Button */}
              <div className="w-full pt-2 flex gap-3 max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isVerifying}
                  className="flex-1 py-3 px-4 rounded-full text-xs font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground border border-secondary hover:bg-secondary/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || otp.join("").length !== 6}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying
                    </>
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </form>
          )}

          {isSuccess && (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Applying changes...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
