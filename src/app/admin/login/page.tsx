"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Phone, Lock, ArrowRight, ShieldCheck, Loader2, Sun, Moon } from "lucide-react";

export default function AdminLoginPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devBypassLoading, setDevBypassLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if there is an active session on mount to auto-login
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          // Valid refresh token exists -> redirect to dashboard immediately
          window.location.href = "/admin/dashboard";
        } else {
          setCheckingSession(false);
        }
      } catch (err) {
        console.error("Auto-login check failed:", err);
        setCheckingSession(false);
      }
    }
    checkSession();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || localStorage.getItem("admin-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    localStorage.setItem("admin-theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const isDev = process.env.NODE_ENV === "development";

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setLoading(true);
    setError(null);
    
    // Simulate sending OTP for regular admin login flow
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 1000);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setError(null);
    
    // Regular login would verify standard Firebase ID token.
    // For safety in this shell, we warn the user if Firebase isn't configured,
    // or let them proceed if they have mock setup.
    setError("Regular phone login is only supported when client-side Firebase SDK is configured. Please use the Dev Auto-Login bypass below for local testing.");
    setLoading(false);
  };

  const handleDevBypass = async () => {
    setDevBypassLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login-mock-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to bypass authentication");
      }

      // Successful login - reload and redirect to dashboard
      window.location.href = "/admin/dashboard";
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
      setDevBypassLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-background via-secondary/15 to-background text-foreground font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-light text-muted-foreground">Verifying secure session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/15 to-background text-foreground font-sans relative overflow-hidden">
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-2.5 rounded-2xl bg-card border border-border/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-300 hover:rotate-12 cursor-pointer shadow-lg"
        >
          {theme === "light" ? (
            <Moon className="w-4.5 h-4.5 text-muted-foreground" />
          ) : (
            <Sun className="w-4.5 h-4.5 text-accent" />
          )}
        </button>
      </div>

      {/* Background radial accent glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card border border-border/60 rounded-3xl p-8 shadow-2xl relative z-10 overflow-hidden transition-all duration-300 hover:border-primary/20">
        {/* Top subtle golden gradient line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-accent to-primary/30" />

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo & Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold tracking-wider uppercase">
              <Sparkles className="w-3 h-3 text-accent" />
              Snail Studio
            </div>
            <h1 className="font-serif text-3xl font-normal tracking-wide text-foreground">
              Admin Portal
            </h1>
            <p className="text-xs text-muted-foreground font-light max-w-xs leading-relaxed">
              Authenticate using your registered mobile number to access administrative panels.
            </p>
          </div>

          {error && (
            <div className="w-full p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-left leading-normal font-light">
              {error}
            </div>
          )}

          {/* Form */}
          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="w-full space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="tel"
                    placeholder="+91 99999 99999"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none transition-all placeholder:text-muted-foreground/50 text-foreground"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || devBypassLoading}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 rounded-xl text-xs font-semibold uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-primary/5 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Send OTP Code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="w-full space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter code"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none tracking-widest text-center font-medium transition-all placeholder:text-muted-foreground/50 text-foreground"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || devBypassLoading}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 rounded-xl text-xs font-semibold uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md shadow-primary/5 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Verify & Enter
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-xs text-primary hover:underline font-light cursor-pointer block mx-auto pt-1"
              >
                Change Phone Number
              </button>
            </form>
          )}

          {/* Developer Bypass Panel */}
          {isDev && (
            <div className="w-full pt-6 border-t border-border/40 space-y-3">
              <div className="flex items-center gap-2 justify-center text-accent">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Developer Mode
                </span>
              </div>
              <button
                type="button"
                onClick={handleDevBypass}
                disabled={loading || devBypassLoading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 rounded-xl text-xs font-semibold uppercase tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all shadow-sm cursor-pointer border border-accent/20"
              >
                {devBypassLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Auto-login as Admin (Dev Bypass)"
                )}
              </button>
              <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                Logs you in as the default seeded administrator (<span className="font-semibold text-foreground">+91 99999 99999</span>).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
