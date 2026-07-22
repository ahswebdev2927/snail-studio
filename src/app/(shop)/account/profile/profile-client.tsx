"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Crown, 
  Gem, 
  Star, 
  Heart,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  X,
  Pencil,
  Camera,
  Trash2
} from "lucide-react";
import { updateUserProfile, getAvatarUploadSignature } from "@/features/account/actions";
import { UserAvatar } from "../user-avatar";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  phoneNumber: string;
  whatsappNumber: string | null;
  image: string | null;
  marketingConsent: boolean;
}

interface ProfileClientProps {
  user: UserProfile;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();

  // Form states
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [whatsappNumber, setWhatsappNumber] = useState(user.whatsappNumber || "");
  const [avatar, setAvatar] = useState<string | null>(user.image);
  const [marketingConsent, setMarketingConsent] = useState(user.marketingConsent);

  // UI/UX States
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Avatar Dropdown Menu & Upload States
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);

  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean success/error alerts after a few seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Profile image must be less than 5MB.");
      return;
    }

    setErrorMessage("");
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

      setAvatar(cloudData.secure_url);
      setSuccessMessage("Avatar uploaded successfully. Don't forget to click Save Changes below to save your profile!");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to upload profile picture.");
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (whatsappNumber.trim()) {
      const cleanPhone = whatsappNumber.replace(/[\s\-()]/g, "");
      if (!/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
        setErrorMessage("Invalid WhatsApp number format. E.g., +919876543210");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await updateUserProfile({
        name: name.trim(),
        email: email.trim() || null,
        whatsappNumber: whatsappNumber.trim() || null,
        image: avatar,
        marketingConsent,
      });

      if (res.success) {
        setSuccessMessage("Your profile information has been updated successfully.");
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to update profile settings.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
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

      {/* Main Alert Banners */}
      {successMessage && (
        <div className="bg-success/15 border border-success/30 text-success p-4 rounded-2xl flex items-start gap-3 text-xs animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-success mt-0.5" />
          <div>
            <p className="font-semibold">Update Successful</p>
            <p className="font-light mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-450 p-4 rounded-2xl flex items-start gap-3 text-xs animate-in slide-in-from-top duration-300">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to Save Changes</p>
            <p className="font-light mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Profile Form Card */}
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Avatar Selection Section */}
        <div className="bg-card border border-border/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative" ref={avatarMenuRef}>
            {/* Avatar Circle */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden border border-border bg-secondary/15 flex items-center justify-center shadow-sm">
              <UserAvatar
                image={avatar}
                name={name || "U"}
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
                      setAvatar(null);
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
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="fullName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 border border-border bg-secondary/20 text-foreground text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </div>

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
          <div className="space-y-2">
            <label htmlFor="emailAddress" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Email Address <span className="text-[10px] text-muted-foreground/50 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="emailAddress"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="janedoe@example.com"
                className="w-full pl-10 pr-4 py-2.5 border border-border bg-secondary/20 text-foreground text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/75 font-light">
              Used for sending order invoices, receipts, and package tracking links.
            </p>
          </div>

          {/* WhatsApp Contact */}
          <div className="space-y-2">
            <label htmlFor="whatsappNum" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              WhatsApp Contact <span className="text-[10px] text-muted-foreground/50 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="whatsappNum"
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+919876543210"
                className="w-full pl-10 pr-4 py-2.5 border border-border bg-secondary/20 text-foreground text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/75 font-light">
              Specify in E.164 format with country code (e.g. +91...) to receive real-time order alerts.
            </p>
          </div>
        </div>

        {/* Marketing Consent Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-3.5 text-xs font-light text-muted-foreground select-none cursor-pointer group">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 w-4.5 h-4.5 accent-primary rounded border-border transition-all cursor-pointer"
            />
            <span className="leading-normal group-hover:text-foreground transition-colors">
              I agree to receive personalized beauty newsletters, exclusive discount keys, and early access sales alerts from Snail Studio via WhatsApp and Email.
            </span>
          </label>
        </div>

        {/* Form Actions Buttons */}
        <div className="pt-4 border-t border-border/20 flex flex-wrap gap-4 items-center justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setName(user.name || "");
              setEmail(user.email || "");
              setWhatsappNumber(user.whatsappNumber || "");
              setAvatar(user.image);
              setMarketingConsent(user.marketingConsent);
              setSuccessMessage("");
              setErrorMessage("");
              setAvatarMenuOpen(false);
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

      </form>
    </div>
  );
}
