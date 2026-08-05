"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Lock, Sparkles, Loader2, ArrowRight, CheckCircle2, User, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Form } from "@/components/forms/form";
import { FormField } from "@/components/forms/form-field";
import { InputField, PhoneInputField, OtpInputField } from "@/components/forms/fields";
import { notify } from "@/lib/toast";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/hooks/use-cart-store";
import {
  loginPhoneSchema,
  otpVerificationSchema,
  profileCompletionSchema,
  type LoginPhoneInput,
  type OtpVerificationInput,
  type ProfileCompletionInput,
} from "@/lib/validators/auth";

interface ProfileFormValues {
  name: string;
  email: string;
  whatsappNumber: string;
  marketingConsent: boolean;
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";

  const isDev = process.env.APP_ENV !== "production";

  const [step, setStep] = useState<"phone" | "otp" | "profile">("phone");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  // Temporary Firebase ID token and verified phone number for new registration onboarding
  const [tempIdToken, setTempIdToken] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");

  // Dev bypass loading state
  const [devLoading, setDevLoading] = useState(false);

  // OTP Resend, Rate Limit, and Cooldown state
  const [resendTimer, setResendTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [cooldownExpiry, setCooldownExpiry] = useState<number | null>(null);

  // Profile completion helper state
  const [sameAsMobile, setSameAsMobile] = useState(true);

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

  // 1. Phone Form (OnChange mode enables reactive validation checks for input sanitization)
  const phoneForm = useForm<LoginPhoneInput>({
    resolver: zodResolver(loginPhoneSchema),
    defaultValues: {
      phoneNumber: "",
    },
    mode: "onChange",
  });

  // 2. OTP Form
  const otpForm = useForm<OtpVerificationInput>({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: {
      otp: "",
    },
    mode: "onChange",
  });

  // 3. Profile Completion Form
  const profileForm = useForm<any>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      name: "",
      email: "",
      whatsappNumber: "",
      marketingConsent: false,
    },
    mode: "onChange",
  });

  // Sync WhatsApp number field when SameAsMobile checkbox is toggled
  useEffect(() => {
    if (sameAsMobile && verifiedPhone) {
      profileForm.setValue("whatsappNumber", verifiedPhone, { shouldValidate: true });
    }
  }, [sameAsMobile, verifiedPhone, profileForm]);

  // 4. Dev Bypass Form
  const devForm = useForm({
    defaultValues: {
      devName: "Jane Doe",
      devPhone: "+919999988888",
      devEmail: "jane.doe@example.com",
      devWhatsapp: "+919999988888",
      sameAsMobile: true,
    },
  });

  const devSameAsMobile = devForm.watch("sameAsMobile");
  const devPhone = devForm.watch("devPhone");

  // Sync whatsapp number if 'same as mobile' is toggled
  useEffect(() => {
    if (devSameAsMobile) {
      devForm.setValue("devWhatsapp", devPhone);
    }
  }, [devPhone, devSameAsMobile, devForm]);

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

  const handlePhoneSubmit = async (data: LoginPhoneInput) => {
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
      setVerifiedPhone(data.phoneNumber);
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

      const confirmation = await signInWithPhoneNumber(auth, verifiedPhone, verifier);
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

  const handleOtpSubmit = async (data: OtpVerificationInput) => {
    if (!confirmationResult) return;
    setLoading(true);

    try {
      const userCredential = await confirmationResult.confirm(data.otp);
      const idToken = await userCredential.user.getIdToken();

      // Retrieve guest cart/wishlist/recently viewed history details to merge on success
      const localWishlist = JSON.parse(localStorage.getItem("snail_wishlist") || "[]");
      let localRecentlyViewed = [];
      try {
        const rvSaved = localStorage.getItem("snail_recently_viewed");
        if (rvSaved) {
          const parsed = JSON.parse(rvSaved);
          if (Array.isArray(parsed)) {
            localRecentlyViewed = parsed.map((p: any) => p?.id).filter(Boolean);
          }
        }
      } catch (e) {
        console.error(e);
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          localWishlist,
          localRecentlyViewed,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        if (resData.newUser) {
          // Unregistered user - redirect to progressive profile completion step
          setTempIdToken(idToken);
          setStep("profile");
          notify.info("Verification complete.", "Please complete your profile to register your account.");
        } else {
          // Existing user - log in immediately
          // Force update local Zustand store items if backend returns updated arrays
          if (resData.user) {
            useCartStore.getState().loadPersistedData();
          }
          notify.success("Logged in successfully. Welcome back!");
          router.push(callbackUrl);
          router.refresh();
        }
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

  const handleProfileSubmit = async (data: any) => {
    setLoading(true);
    try {
      const localWishlist = JSON.parse(localStorage.getItem("snail_wishlist") || "[]");
      let localRecentlyViewed = [];
      try {
        const rvSaved = localStorage.getItem("snail_recently_viewed");
        if (rvSaved) {
          const parsed = JSON.parse(rvSaved);
          if (Array.isArray(parsed)) {
            localRecentlyViewed = parsed.map((p: any) => p?.id).filter(Boolean);
          }
        }
      } catch (e) {
        console.error(e);
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: tempIdToken,
          name: data.name,
          email: data.email,
          whatsappNumber: sameAsMobile ? verifiedPhone : data.whatsappNumber,
          marketingConsent: data.marketingConsent,
          localWishlist,
          localRecentlyViewed,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        useCartStore.getState().loadPersistedData();
        notify.success("Profile registration complete!", "Welcome to Snail Studio.");
        router.push(callbackUrl);
        router.refresh();
      } else {
        notify.error(resData.error || "Failed to submit profile details.");
      }
    } catch (err) {
      console.error("Registration failed:", err);
      notify.error("Connection failed. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async (data: any) => {
    setDevLoading(true);

    const formattedPhone = data.devPhone.replace(/[^\d+]/g, "");
    const formattedWhatsapp = data.sameAsMobile
      ? formattedPhone
      : data.devWhatsapp.replace(/[^\d+]/g, "");

    try {
      const res = await fetch("/api/auth/login-mock-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          name: data.devName,
          email: data.devEmail,
          whatsappNumber: formattedWhatsapp,
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

  const slideVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="w-full max-w-md mx-auto my-12 px-4">
      <div className="bg-card/75 border border-border/40 backdrop-blur-md rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-primary/20">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-accent to-primary/30" />
        <div className="absolute -right-12 -top-12 w-28 h-28 rounded-full bg-accent/5 blur-2xl pointer-events-none" />

        <div className="text-center space-y-2 mb-8 animate-fade-in">
          <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
            <Sparkles className="w-2.5 h-2.5" />
            Customer Portal
          </span>
          <h1 className="font-serif text-2xl font-semibold tracking-wide text-foreground">
            {step === "profile" ? "Complete Your Profile" : "Sign In / Register"}
          </h1>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            {step === "phone" && "Enter your mobile number to receive a secure one-time passcode."}
            {step === "otp" && "Enter the 6-digit code sent to your phone number."}
            {step === "profile" && "Provide your details to finish setting up your account."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "phone" && (
            <motion.div
              key="phone-step"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={slideVariants}
              transition={{ duration: 0.2 }}
            >
              <Form methods={phoneForm} onSubmit={handlePhoneSubmit} className="space-y-4">
                <FormField name="phoneNumber" label="Mobile Number" required>
                  <PhoneInputField placeholder="99999 99999" />
                </FormField>

                <Button
                  type="submit"
                  disabled={loading || !phoneForm.formState.isValid}
                  className="w-full py-6 rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
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
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp-step"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={slideVariants}
              transition={{ duration: 0.2 }}
            >
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

                <Button
                  type="submit"
                  disabled={loading || !otpForm.formState.isValid}
                  className="w-full py-6 rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>
              </Form>
            </motion.div>
          )}

          {step === "profile" && (
            <motion.div
              key="profile-step"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={slideVariants}
              transition={{ duration: 0.2 }}
            >
              <Form methods={profileForm as any} onSubmit={handleProfileSubmit as any} className="space-y-4">
                <FormField name="name" label="Full Name" required>
                  <InputField leftIcon={<User className="w-3.5 h-3.5" />} placeholder="Enter your full name" />
                </FormField>

                <FormField name="email" label="Email Address" required>
                  <InputField
                    type="email"
                    leftIcon={<Mail className="w-3.5 h-3.5" />}
                    placeholder="name@example.com"
                  />
                </FormField>
                <p className="text-[10px] text-muted-foreground/80 pl-1 -mt-2 leading-relaxed">
                  We'll use this email for order confirmations, shipping updates, invoices, and important account notifications.
                </p>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 pl-1 select-none">
                    <input
                      id="same-whatsapp"
                      type="checkbox"
                      checked={sameAsMobile}
                      onChange={(e) => setSameAsMobile(e.target.checked)}
                      className="w-4 h-4 rounded border-border accent-primary cursor-pointer focus:outline-none"
                    />
                    <label htmlFor="same-whatsapp" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Same as Mobile Number
                    </label>
                  </div>

                  <FormField name="whatsappNumber" label="WhatsApp Number" required>
                    <PhoneInputField
                      disabled={sameAsMobile}
                      className={sameAsMobile ? "opacity-60 bg-muted/20" : ""}
                    />
                  </FormField>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/25">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                    Communication Preferences
                  </span>
                  
                  {/* Order Updates (Required/Read-Only) */}
                  <div className="flex items-start gap-2.5 px-1 py-1.5 opacity-70">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      className="w-4 h-4 rounded border-border accent-muted bg-muted cursor-not-allowed"
                    />
                    <div className="space-y-0.5">
                      <label className="text-xs font-semibold text-foreground/90 cursor-not-allowed">
                        Order Updates
                      </label>
                      <p className="text-[10px] text-muted-foreground/80 leading-normal">
                        Receive real-time transactional alerts about your purchases, shipping, and delivery.
                      </p>
                    </div>
                  </div>

                  {/* Marketing Emails (Optional) */}
                  <div className="flex items-start gap-2.5 px-1 py-1.5 select-none cursor-pointer group">
                    <input
                      id="marketing-emails"
                      type="checkbox"
                      {...profileForm.register("marketingConsent")}
                      className="w-4 h-4 rounded border-border accent-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary mt-0.5"
                    />
                    <div className="space-y-0.5 cursor-pointer">
                      <label htmlFor="marketing-emails" className="text-xs font-semibold text-foreground/90 cursor-pointer group-hover:text-primary transition-colors">
                        Marketing Updates
                      </label>
                      <p className="text-[10px] text-muted-foreground/85 leading-normal">
                        Send me offers, discounts and new collection updates.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !profileForm.formState.isValid}
                  className="w-full py-6 rounded-2xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                >
                  {loading ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    "Complete Profile"
                  )}
                </Button>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>

        {isDev && step !== "profile" && (
          <>
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
                    Test Email
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
                      id="dev-same-whatsapp"
                      type="checkbox"
                      {...devForm.register("sameAsMobile")}
                      className="rounded border-border text-primary focus:ring-primary w-3 h-3 cursor-pointer"
                    />
                    <label htmlFor="dev-same-whatsapp" className="text-[8px] font-bold text-muted-foreground uppercase cursor-pointer select-none">
                      WhatsApp same as mobile number
                    </label>
                  </div>

                  {!devSameAsMobile && (
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
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-light text-muted-foreground">Loading login form...</p>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
