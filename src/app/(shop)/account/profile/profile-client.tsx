"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  User, 
  Mail, 
  MessageSquare, 
  Phone, 
  Lock, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown,
  Pencil,
  Camera,
  Trash2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserProfile, getAvatarUploadSignature } from "@/features/account/actions";
import { UserAvatar } from "../user-avatar";
import { Form } from "@/components/forms/form";
import { FormField } from "@/components/forms/form-field";
import { InputField } from "@/components/forms/fields";
import { notify } from "@/lib/toast";
import { profileCompletionSchema, type ProfileCompletionInput } from "@/lib/validators/auth";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  phoneNumber: string;
  whatsappNumber: string | null;
  image: string | null;
  marketingConsent: boolean;
  preferences?: {
    newsletter: boolean;
    promotions: boolean;
    launchNotifications: boolean;
    backInStock: boolean;
    productUpdates: boolean;
    priceDrops: boolean;
  };
}

interface ProfileClientProps {
  user: UserProfile;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const isEmailRequiredError = searchParams.get("error") === "email_required";

  // Accordion UI state
  const [prefAccordionOpen, setPrefAccordionOpen] = useState(false);

  // Loading, upload & overlay states
  const [loading, setLoading] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);

  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RHF Setup with centralized profile schema
  const form = useForm({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      name: user.name || "",
      email: user.email || "",
      whatsappNumber: user.whatsappNumber || "",
      image: user.image || "",
      marketingConsent: user.marketingConsent,
      preferences: {
        newsletter: user.preferences?.newsletter ?? true,
        promotions: user.preferences?.promotions ?? true,
        launchNotifications: user.preferences?.launchNotifications ?? true,
        backInStock: user.preferences?.backInStock ?? true,
        productUpdates: user.preferences?.productUpdates ?? true,
        priceDrops: user.preferences?.priceDrops ?? true,
      },
    },
    mode: "onBlur",
  });

  const marketingConsent = form.watch("marketingConsent");
  const avatar = form.watch("image");
  const nameValue = form.watch("name");

  // Close avatar menu on click away
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    if (avatarMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [avatarMenuOpen]);

  // Format WhatsApp input to enforce +91 prefix E.164 style
  const formatWhatsappNumber = (val: string) => {
    let digits = val.replace(/\s+/g, "");
    if (!digits) return "";
    if (!digits.startsWith("+91")) {
      const raw = digits.replace(/[^\d]/g, "");
      if (raw.startsWith("91") && raw.length > 2) {
        digits = "+" + raw;
      } else {
        digits = "+91" + raw;
      }
    }
    return digits.slice(0, 13);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify.error("Please select a valid image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      notify.error("Profile image must be less than 8MB.");
      return;
    }

    setAvatarUploading(true);
    setAvatarProgress(0);

    try {
      const signRes = await getAvatarUploadSignature();
      if (!signRes.success) {
        throw new Error(signRes.error || "Failed to generate upload signature.");
      }

      const { apiKey, timestamp, signature, folder, uploadPreset, cloudName } = signRes;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);
      if (uploadPreset) {
        formData.append("upload_preset", uploadPreset);
      }

      const cloudUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const cloudData = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", cloudUrl, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setAvatarProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve(res);
            } catch {
              reject(new Error("Failed to parse Cloudinary response."));
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.error?.message || "Failed to upload avatar to Cloudinary."));
            } catch {
              reject(new Error("Failed to upload avatar."));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during avatar upload."));
        };

        xhr.send(formData);
      });

      form.setValue("image", cloudData.secure_url, { shouldValidate: true });
      notify.success("Profile picture uploaded. Click Save Changes to save your profile!");
    } catch (err: any) {
      console.error(err);
      notify.error(err.message || "Failed to upload profile picture.");
      
      // Report upload failure to backend to generate system notification
      try {
        fetch("/api/media/report-failure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: err.message || "Failed avatar upload",
            fileName: file.name,
            folder: "avatars",
          })
        });
      } catch (reportErr) {
        console.error("Failed to report profile avatar upload failure:", reportErr);
      }
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);

    try {
      const res = await updateUserProfile({
        name: data.name,
        email: data.email,
        whatsappNumber: data.whatsappNumber || null,
        image: data.image || null,
        marketingConsent: data.marketingConsent,
        preferences: data.preferences,
      });

      if (res.success) {
        notify.success("Your profile information has been updated successfully.");
        router.refresh();
        if (isEmailRequiredError) {
          router.push("/account");
        }
      } else {
        notify.error(res.error || "Failed to update profile settings.");
      }
    } catch (err: any) {
      console.error(err);
      notify.error(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="space-y-1 pb-4 border-b border-border/20">
        <h2 className="font-serif text-2xl font-semibold text-foreground tracking-wide flex items-center gap-2">
          Profile Settings
        </h2>
        <p className="text-xs text-muted-foreground font-light">
          Manage your personal details, contact coordinates, and signature avatar.
        </p>
      </div>

      {/* Required Email Alert Banner */}
      {isEmailRequiredError && (
        <div className="bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 p-4 rounded-2xl flex items-start gap-3 text-xs animate-in slide-in-from-top duration-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5 animate-pulse" />
          <div>
            <p className="font-semibold">Email Requirement</p>
            <p className="font-light mt-0.5">
              An email address is required to proceed to your account dashboard. Please enter a valid email to receive order status updates and notifications.
            </p>
          </div>
        </div>
      )}

      {/* Profile Form */}
      <Form methods={form} onSubmit={onSubmit} className="space-y-8">
        
        {/* Avatar Selection Section */}
        <div className="bg-card border border-border/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative" ref={avatarMenuRef}>
            {/* Avatar Circle */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden border border-border bg-secondary/15 flex items-center justify-center shadow-sm">
              <UserAvatar
                image={avatar || null}
                name={nameValue || "U"}
                phone={user.phoneNumber}
                className="w-full h-full rounded-full"
              />
              
              {/* Spinner/Upload overlay */}
              {avatarUploading && (
                <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex flex-col items-center justify-center z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  {avatarProgress !== null && (
                    <span className="text-[9px] font-bold text-foreground mt-0.5">{avatarProgress}%</span>
                  )}
                </div>
              )}
            </div>

            {/* Pencil button top right */}
            <button
              type="button"
              onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              disabled={avatarUploading}
              className="absolute -top-1 -right-1 p-1.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-full shadow-lg border border-background hover:scale-105 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Edit avatar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            {avatarMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-2xl shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/35 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  Upload Photo
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      form.setValue("image", "", { shouldValidate: true });
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-xs text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove Photo
                  </button>
                )}
              </div>
            )}
            
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <h3 className="font-serif text-base font-semibold text-foreground">Profile Picture</h3>
            <p className="text-[11px] text-muted-foreground font-light max-w-sm">
              Click the pencil icon on your profile image to upload a new avatar or restore the default initials.
            </p>
          </div>
        </div>

        {/* Input fields grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <FormField name="name" label="Full Name" required>
            <InputField
              leftIcon={<User className="w-4 h-4 text-muted-foreground/60" />}
              placeholder="Jane Doe"
            />
          </FormField>

          {/* Phone Number (Verified, Read-only) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mobile Number
              </label>
              <span className="text-[9px] uppercase font-semibold text-success bg-success/15 px-2 py-0.5 rounded-full border border-success/30 flex items-center gap-1 select-none">
                <Lock className="w-2.5 h-2.5" /> Verified
              </span>
            </div>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="text"
                disabled
                value={user.phoneNumber}
                className="w-full pl-10 pr-4 py-2.5 border border-border bg-secondary/5 text-muted-foreground/80 text-xs rounded-xl select-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Email Address */}
          <FormField 
            name="email" 
            label="Email Address" 
            required 
            description="Required for sending order invoices, receipts, order status updates, and package tracking links."
          >
            <InputField
              leftIcon={<Mail className="w-4 h-4 text-muted-foreground/60" />}
              type="email"
              placeholder="janedoe@example.com"
            />
          </FormField>

          {/* WhatsApp Contact */}
          <FormField 
            name="whatsappNumber" 
            label="WhatsApp Contact (Optional)" 
            description="Specify with country code (+91 followed by 10 digits) to receive real-time order alerts."
          >
            <InputField
              leftIcon={<MessageSquare className="w-4 h-4 text-muted-foreground/60" />}
              placeholder="+919876543210"
              onChange={(e) => {
                const formatted = formatWhatsappNumber(e.target.value);
                form.setValue("whatsappNumber", formatted, { shouldValidate: true });
              }}
            />
          </FormField>
        </div>

        {/* Marketing Consent Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-3.5 text-xs font-light text-muted-foreground select-none cursor-pointer group">
            <input
              type="checkbox"
              {...form.register("marketingConsent")}
              className="mt-0.5 w-4.5 h-4.5 accent-primary rounded border-border transition-all cursor-pointer"
            />
            <span className="leading-normal group-hover:text-foreground transition-colors">
              I agree to receive personalized beauty newsletters, exclusive discount keys, and early access sales alerts from Snail Studio via WhatsApp and Email.
            </span>
          </label>
        </div>

        {/* Email & Notification Preferences Card */}
        {marketingConsent && (
          <div className="bg-card border border-border/30 rounded-3xl p-6 space-y-4 animate-in fade-in duration-300">
            <div 
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setPrefAccordionOpen(!prefAccordionOpen)}
            >
              <div className="space-y-1">
                <h3 className="font-serif text-base font-semibold text-foreground">Email & Notification Preferences</h3>
                <p className="text-[11px] text-muted-foreground font-light">
                  Customize how and when you want to receive updates from Snail Studio.
                </p>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${prefAccordionOpen ? "rotate-180" : ""}`} />
            </div>

            {prefAccordionOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-in fade-in duration-300">
                {/* Newsletter */}
                <label className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/5 hover:bg-secondary/15 transition-all cursor-pointer group border border-border/20">
                  <input
                    type="checkbox"
                    {...form.register("preferences.newsletter")}
                    className="mt-0.5 w-4 h-4 accent-primary rounded border-border cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Studio Newsletters</span>
                    <p className="text-[10px] text-muted-foreground/70 font-light">Get the latest collection releases, designer notes, and studio updates.</p>
                  </div>
                </label>

                {/* Promotions */}
                <label className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/5 hover:bg-secondary/15 transition-all cursor-pointer group border border-border/20">
                  <input
                    type="checkbox"
                    {...form.register("preferences.promotions")}
                    className="mt-0.5 w-4 h-4 accent-primary rounded border-border cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Promotional Offers</span>
                    <p className="text-[10px] text-muted-foreground/70 font-light">Receive discount keys, coupon codes, and exclusive storewide sales.</p>
                  </div>
                </label>

                {/* Launches & Restocks */}
                <label className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/5 hover:bg-secondary/15 transition-all cursor-pointer group border border-border/20">
                  <input
                    type="checkbox"
                    {...form.register("preferences.launchNotifications")}
                    className="mt-0.5 w-4 h-4 accent-primary rounded border-border cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Launches & Restocks</span>
                    <p className="text-[10px] text-muted-foreground/70 font-light">Be the first to know about new drops and hot item restocks.</p>
                  </div>
                </label>

                {/* Price Drops */}
                <label className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/5 hover:bg-secondary/15 transition-all cursor-pointer group border border-border/20">
                  <input
                    type="checkbox"
                    {...form.register("preferences.priceDrops")}
                    className="mt-0.5 w-4 h-4 accent-primary rounded border-border cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Price Drop Alerts</span>
                    <p className="text-[10px] text-muted-foreground/70 font-light">Get alerts when price reductions occur on your favorite items.</p>
                  </div>
                </label>

                {/* Back in stock */}
                <label className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/5 hover:bg-secondary/15 transition-all cursor-pointer group border border-border/20">
                  <input
                    type="checkbox"
                    {...form.register("preferences.backInStock")}
                    className="mt-0.5 w-4 h-4 accent-primary rounded border-border cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Back-In-Stock Alerts</span>
                    <p className="text-[10px] text-muted-foreground/70 font-light">Automatic alerts when products you view are back in stock.</p>
                  </div>
                </label>

                {/* Product care */}
                <label className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/5 hover:bg-secondary/15 transition-all cursor-pointer group border border-border/20">
                  <input
                    type="checkbox"
                    {...form.register("preferences.productUpdates")}
                    className="mt-0.5 w-4 h-4 accent-primary rounded border-border cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Product Care & Tips</span>
                    <p className="text-[10px] text-muted-foreground/70 font-light">Receive detailed guides, application tips, and sizing advice.</p>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Form Actions Buttons */}
        <div className="pt-4 border-t border-border/20 flex flex-wrap gap-4 items-center justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              form.reset();
              setPrefAccordionOpen(false);
            }}
            className="px-6 py-3 border border-border text-foreground hover:bg-secondary/40 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset Form
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/10 transition-all cursor-pointer disabled:bg-muted disabled:text-text-disabled disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Updates...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>

      </Form>
    </div>
  );
}
