"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Lock, Sparkles, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Dev bypass states
  const [devPhone, setDevPhone] = useState("+91 99999 88888");
  const [devName, setDevName] = useState("Jane Doe");
  const [devEmail, setDevEmail] = useState("jane.doe@example.com");
  const [devWhatsapp, setDevWhatsapp] = useState("+91 99999 88888");
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [devLoading, setDevLoading] = useState(false);

  // Sync whatsapp number if 'same as mobile' is toggled
  useEffect(() => {
    if (sameAsMobile) {
      setDevWhatsapp(devPhone);
    }
  }, [devPhone, sameAsMobile]);

  // Check if a session already exists to skip login
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          router.push(callbackUrl);
          router.refresh();
        } else {
          setCheckingSession(false);
        }
      } catch (err) {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router, callbackUrl]);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setLoading(true);
    setErrorMsg("");

    // Simulate OTP delivery
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 800);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setErrorMsg("");

    // Display message that production Firebase is simulated here, prompting bypass usage
    setTimeout(() => {
      setLoading(false);
      setErrorMsg("Firebase phone verification is simulated. Please use the developer bypass option below for instant local login.");
    }, 600);
  };

  const handleDevBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login-mock-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: devPhone,
          name: devName,
          email: devEmail,
          whatsappNumber: sameAsMobile ? devPhone : devWhatsapp,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setErrorMsg(data.error || "Bypass login failed.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to connect to dev bypass endpoint.");
    } finally {
      setDevLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-light text-muted-foreground">Verifying secure session...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto my-12 px-4">
      <div className="bg-card/75 border border-border/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-primary/20">
        {/* Subtle decorative glowing background items */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-accent to-primary/30" />
        <div className="absolute -right-12 -top-12 w-28 h-28 rounded-full bg-accent/5 blur-2xl pointer-events-none" />

        <div className="text-center space-y-2 mb-8">
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
            <Sparkles className="w-2.5 h-2.5" />
            Customer Portal
          </span>
          <h1 className="font-serif text-2xl font-semibold tracking-wide text-foreground">
            Sign In / Register
          </h1>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Enter your mobile number to receive a secure one-time passcode.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-xs text-destructive text-center">
            {errorMsg}
          </div>
        )}

        {/* Regular Simulated Firebase Auth Flow */}
        <form onSubmit={step === "phone" ? handlePhoneSubmit : handleOtpSubmit} className="space-y-4">
          {step === "phone" ? (
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pl-1">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 99999 00000"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-secondary/30 border border-border/40 focus:border-primary/50 outline-none text-sm transition-all placeholder:text-muted-foreground/45"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center pl-1">
                <label htmlFor="otp" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="text-[10px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Change number
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground/60">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-secondary/30 border border-border/40 focus:border-primary/50 outline-none text-sm tracking-widest text-center font-mono transition-all placeholder:text-muted-foreground/45 placeholder:tracking-normal"
                />
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full py-6 rounded-2xl cursor-pointer">
            {loading ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : step === "phone" ? (
              <>
                Send Passcode
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            ) : (
              "Verify & Sign In"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-8 flex items-center gap-3">
          <div className="flex-1 h-[1px] bg-border/20" />
          <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60">
            Dev Bypass Options
          </span>
          <div className="flex-1 h-[1px] bg-border/20" />
        </div>

        {/* Developer Bypass Panel */}
        <form onSubmit={handleDevBypass} className="space-y-3.5 bg-secondary/25 border border-border/30 rounded-2xl p-5">
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium pb-1.5 border-b border-border/20">
            <CheckCircle2 className="w-4 h-4" />
            Instant Customer Login
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-muted-foreground uppercase pl-0.5">
                  Test Name
                </label>
                <input
                  type="text"
                  required
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border/35 text-[11px] outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-muted-foreground uppercase pl-0.5">
                  Test Phone
                </label>
                <input
                  type="text"
                  required
                  value={devPhone}
                  onChange={(e) => setDevPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border/35 text-[11px] outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-muted-foreground uppercase pl-0.5">
                Test Email (For offers/orders update)
              </label>
              <input
                type="email"
                required
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border/35 text-[11px] outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pl-0.5">
                <input
                  id="same-whatsapp"
                  type="checkbox"
                  checked={sameAsMobile}
                  onChange={(e) => setSameAsMobile(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                />
                <label htmlFor="same-whatsapp" className="text-[8px] font-bold text-muted-foreground uppercase cursor-pointer select-none">
                  WhatsApp same as mobile number
                </label>
              </div>

              {!sameAsMobile && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[8px] font-bold text-muted-foreground uppercase pl-0.5">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    required
                    value={devWhatsapp}
                    onChange={(e) => setDevWhatsapp(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border/35 text-[11px] outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={devLoading}
            variant="outline"
            className="w-full py-4 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-primary hover:text-primary-foreground border-primary/20 transition-all cursor-pointer"
          >
            {devLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Sign In with Mock Details"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-light text-muted-foreground">Loading login form...</p>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
