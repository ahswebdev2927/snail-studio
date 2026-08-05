"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Lock, Sparkles, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Form } from "@/components/forms/form";
import { FormField } from "@/components/forms/form-field";
import { InputField, PhoneInputField, OtpInputField } from "@/components/forms/fields";
import { notify } from "@/lib/toast";
import { loginPhoneSchema, otpVerificationSchema, type LoginPhoneInput, type OtpVerificationInput } from "@/lib/validators/auth";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const isDev = process.env.APP_ENV !== "production";

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  // Dev bypass loading state
  const [devLoading, setDevLoading] = useState(false);

  // OTP Resend, Rate Limit, and Cooldown state
  const [resendTimer, setResendTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [cooldownExpiry, setCooldownExpiry] = useState<number | null>(null);

  // Monitor resendTimer tick
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Monitor cooldownExpiry tick
  useEffect(() => {
    if (!cooldownExpiry) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= cooldownExpiry) {
        localStorage.removeItem("customer_otp_resend_count");
        localStorage.removeItem("customer_otp_cooldown_expiry");
        localStorage.removeItem("customer_otp_last_sent");
        setResendCount(0);
        setCooldownExpiry(null);
        setResendTimer(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownExpiry]);

  // Initialize/Load OTP resend timers on step change
  useEffect(() => {
    if (step === "otp") {
      const storedCount = localStorage.getItem("customer_otp_resend_count");
      const storedExpiry = localStorage.getItem("customer_otp_cooldown_expiry");
      const storedLastSent = localStorage.getItem("customer_otp_last_sent");

      const now = Date.now();

      if (storedExpiry) {
        const expiryTime = parseInt(storedExpiry, 10);
        if (now < expiryTime) {
          setCooldownExpiry(expiryTime);
          setResendCount(3);
          return;
        } else {
          localStorage.removeItem("customer_otp_resend_count");
          localStorage.removeItem("customer_otp_cooldown_expiry");
          localStorage.removeItem("customer_otp_last_sent");
          setResendCount(0);
          setCooldownExpiry(null);
        }
      }

      if (storedCount) {
        setResendCount(parseInt(storedCount, 10));
      }

      if (storedLastSent) {
        const lastSentTime = parseInt(storedLastSent, 10);
        const elapsed = Math.floor((now - lastSentTime) / 1000);
        if (elapsed < 60) {
          setResendTimer(60 - elapsed);
        } else {
          setResendTimer(0);
        }
      } else {
        setResendTimer(60);
        localStorage.setItem("customer_otp_last_sent", now.toString());
      }
    }
  }, [step]);

  // 1. Phone Form
  const phoneForm = useForm<LoginPhoneInput>({
    resolver: zodResolver(loginPhoneSchema),
    defaultValues: {
      phoneNumber: "+91",
    },
    mode: "onBlur",
  });

  // 2. OTP Form
  const otpForm = useForm<OtpVerificationInput>({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: {
      otp: "",
    },
    mode: "onBlur",
  });

  // 3. Dev Bypass Form
  const devForm = useForm({
    defaultValues: {
      devName: "Jane Doe",
      devPhone: "+919999988888",
      devEmail: "jane.doe@example.com",
      devWhatsapp: "+919999988888",
      sameAsMobile: true,
    },
  });

  const sameAsMobile = devForm.watch("sameAsMobile");
  const devPhone = devForm.watch("devPhone");

  // Sync whatsapp number if 'same as mobile' is toggled
  useEffect(() => {
    if (sameAsMobile) {
      devForm.setValue("devWhatsapp", devPhone);
    }
  }, [devPhone, sameAsMobile, devForm]);

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

  // Clean up recaptcha verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.error("Error clearing RecaptchaVerifier:", e);
        }
      }
    };
  }, [recaptchaVerifier]);

  // Format Phone Number on input change to strictly prefix +91
  const formatPhoneNumber = (val: string) => {
    let digits = val.replace(/\s+/g, "");
    if (!digits.startsWith("+91")) {
      // Remove any non-digits to isolate inputs
      const raw = digits.replace(/[^\d]/g, "");
      // If user typed 91 initially, don't duplicate it
      if (raw.startsWith("91") && raw.length > 2) {
        digits = "+" + raw;
      } else {
        digits = "+91" + raw;
      }
    }
    // Limit to +91 (3 chars) + 10 digits = 13 chars max
    return digits.slice(0, 13);
  };

  const handlePhoneSubmit = async (data: any) => {
    // Check local cooldown before triggering API
    const storedExpiry = localStorage.getItem("customer_otp_cooldown_expiry");
    if (storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      if (Date.now() < expiryTime) {
        const remainingMinutes = Math.ceil((expiryTime - Date.now()) / 60000);
        notify.error(`Resend limit reached. Please try again in ${remainingMinutes} minutes.`);
        return;
      }
    }

    setLoading(true);

    try {
      let verifier = recaptchaVerifier;
      if (!verifier) {
        const container = document.getElementById("recaptcha-container");
        if (container) {
          container.innerHTML = "";
        }
        verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {},
        });
        setRecaptchaVerifier(verifier);
      }

      const confirmation = await signInWithPhoneNumber(auth, data.phoneNumber, verifier);
      setConfirmationResult(confirmation);
      setStep("otp");
      localStorage.setItem("customer_otp_last_sent", Date.now().toString());
      notify.success("Verification code sent successfully.");
    } catch (err: any) {
      console.error("Firebase Phone Send OTP failed:", err);
      setRecaptchaVerifier(null);
      let friendlyMsg = "Failed to send code. Please verify your phone number and try again.";
      if (err.code === "auth/invalid-phone-number") {
        friendlyMsg = "Invalid phone number format. Please check the number and try again.";
      } else if (err.code === "auth/too-many-requests") {
        friendlyMsg = "Too many requests. SMS quota exceeded or traffic block. Please try again later or use the Dev Bypass.";
      }
      notify.error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const now = Date.now();
    
    // Cooldown check
    if (cooldownExpiry && now < cooldownExpiry) {
      const remainingMinutes = Math.ceil((cooldownExpiry - now) / 60000);
      notify.error(`Resend limit reached. Please try again in ${remainingMinutes} minutes.`);
      return;
    }

    if (resendCount >= 3) {
      const expiry = now + 60 * 60 * 1000;
      setCooldownExpiry(expiry);
      localStorage.setItem("customer_otp_cooldown_expiry", expiry.toString());
      notify.error("Resend limit reached. Please wait 1 hour before trying again.");
      return;
    }

    if (resendTimer > 0) {
      notify.error(`Please wait ${resendTimer} seconds before requesting a new code.`);
      return;
    }

    setLoading(true);
    try {
      const phoneNumber = phoneForm.getValues("phoneNumber");
      let verifier = recaptchaVerifier;
      if (!verifier) {
        const container = document.getElementById("recaptcha-container");
        if (container) {
          container.innerHTML = "";
        }
        verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          callback: () => {},
        });
        setRecaptchaVerifier(verifier);
      }

      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(confirmation);

      const nextCount = resendCount + 1;
      setResendCount(nextCount);
      localStorage.setItem("customer_otp_resend_count", nextCount.toString());
      localStorage.setItem("customer_otp_last_sent", Date.now().toString());

      setResendTimer(60);
      notify.success(`Verification code resent successfully (Attempt ${nextCount}/3).`);

      if (nextCount >= 3) {
        const expiry = Date.now() + 60 * 60 * 1000;
        setCooldownExpiry(expiry);
        localStorage.setItem("customer_otp_cooldown_expiry", expiry.toString());
      }
    } catch (err: any) {
      console.error("Firebase Phone Resend OTP failed:", err);
      let friendlyMsg = "Failed to resend code. Please try again.";
      if (err.code === "auth/too-many-requests") {
        friendlyMsg = "Too many requests. Please try again later.";
      }
      notify.error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (data: any) => {
    if (!confirmationResult) return;
    setLoading(true);

    try {
      const userCredential = await confirmationResult.confirm(data.otp);
      const idToken = await userCredential.user.getIdToken();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        notify.success("Log in successful. Redirecting...");
        router.push(callbackUrl);
        router.refresh();
      } else {
        notify.error(resData.error || "Authentication failed on local server.");
      }
    } catch (err: any) {
      console.error("Firebase OTP Verification failed:", err);
      let friendlyMsg = "Invalid verification code. Please check the OTP and try again.";
      if (err.code === "auth/invalid-verification-code") {
        friendlyMsg = "The verification code you entered is invalid. Please check the OTP.";
      } else if (err.code === "auth/code-expired") {
        friendlyMsg = "The verification code has expired. Please send a new code.";
      }
      notify.error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async (data: any) => {
    setDevLoading(true);

    // Normalize phone numbers for dev bypass
    const phone = formatPhoneNumber(data.devPhone);
    const whatsapp = data.sameAsMobile ? phone : formatPhoneNumber(data.devWhatsapp);

    try {
      const res = await fetch("/api/auth/login-mock-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          name: data.devName,
          email: data.devEmail,
          whatsappNumber: whatsapp,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        notify.success("Bypass sign-in successful. Redirecting...");
        router.push(callbackUrl);
        router.refresh();
      } else {
        notify.error(resData.error || "Bypass login failed.");
      }
    } catch (err: any) {
      console.error(err);
      notify.error("Failed to connect to dev bypass endpoint.");
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

        {/* Regular Simulated Firebase Auth Flow */}
        {step === "phone" ? (
          <Form methods={phoneForm} onSubmit={handlePhoneSubmit} className="space-y-4">
            <FormField name="phoneNumber" label="Mobile Number" required>
              <PhoneInputField />
            </FormField>

            <Button type="submit" disabled={loading} className="w-full py-6 rounded-2xl cursor-pointer">
              {loading ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <>
                  Send Passcode
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </Form>
        ) : (
          <Form methods={otpForm} onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="flex justify-between items-center pl-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Verification Code
              </label>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="text-[10px] font-medium text-primary hover:underline cursor-pointer bg-transparent border-none outline-none"
              >
                Change number
              </button>
            </div>
            <FormField name="otp">
              <OtpInputField />
            </FormField>

            {/* Resend Code Trigger */}
            <div className="flex justify-center items-center text-xs pt-1 pb-2 font-sans select-none min-h-[28px]">
              {cooldownExpiry ? (
                <div className="text-[10px] text-rose-500 font-medium tracking-wide bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 text-center w-full">
                  Resend limit reached. Try again in {Math.ceil((cooldownExpiry - Date.now()) / 60000)}m
                </div>
              ) : resendTimer > 0 ? (
                <span className="text-[10px] text-muted-foreground font-light">
                  Resend code in <strong className="font-semibold text-foreground/80">{resendTimer}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-[10px] font-semibold text-primary hover:underline cursor-pointer bg-transparent border-none outline-none transition-all focus:outline-none flex items-center gap-1"
                >
                  Resend Code {resendCount > 0 && <span className="opacity-60">({resendCount}/3)</span>}
                </button>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full py-6 rounded-2xl cursor-pointer">
              {loading ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                "Verify & Sign In"
              )}
            </Button>
          </Form>
        )}

        {/* Developer Bypass Panel (Only rendered in local development mode) */}
        {isDev && (
          <>
            {/* Divider */}
            <div className="my-8 flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-border/20" />
              <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground/60">
                Dev Bypass Options
              </span>
              <div className="flex-1 h-[1px] bg-border/20" />
            </div>

            <Form methods={devForm} onSubmit={handleDevBypass} className="space-y-3.5 bg-secondary/25 border border-border/30 rounded-2xl p-5">
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
                      {...devForm.register("devName")}
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
                      {...devForm.register("devPhone")}
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
                    {...devForm.register("devEmail")}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border/35 text-[11px] outline-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 pl-0.5">
                    <input
                      id="same-whatsapp"
                      type="checkbox"
                      {...devForm.register("sameAsMobile")}
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
                        {...devForm.register("devWhatsapp")}
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
            </Form>
          </>
        )}
        <div id="recaptcha-container" className="hidden"></div>
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
