"use client";

import React, { useState, useEffect } from "react";
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
  X
} from "lucide-react";
import { updateUserProfile } from "@/features/account/actions";
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
  const [selectedAvatar, setSelectedAvatar] = useState(user.image || "");
  const [marketingConsent, setMarketingConsent] = useState(user.marketingConsent);
  const [customAvatarUrl, setCustomAvatarUrl] = useState(
    user.image && !user.image.startsWith("preset:") ? user.image : ""
  );
  const [avatarMode, setAvatarMode] = useState<"preset" | "custom">(
    user.image && !user.image.startsWith("preset:") ? "custom" : "preset"
  );

  // UI/UX States
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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

  // Disable background page scrolling when modal is open
  useEffect(() => {
    if (showAvatarPicker) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showAvatarPicker]);

  // Preset Avatars Metadata
  const PRESET_AVATARS = [
    { id: "preset:cream-rose", label: "Cream Rose", bg: "from-[#faf0ec] to-[#e8c8bd] border-[#dcaba0] text-[#854d3d]", type: "initials" },
    { id: "preset:champagne-gold", label: "Champagne Gold", bg: "from-[#f7f3e8] to-[#dfcfab] border-[#cfbb8c] text-[#826127]", type: "initials" },
    { id: "preset:velvet-plum", label: "Velvet Plum", bg: "from-[#f8eff2] to-[#e4becf] border-[#d8a3be] text-[#823055]", type: "initials" },
    { id: "preset:soft-sage", label: "Soft Sage", bg: "from-[#edf2ed] to-[#c6d7c6] border-[#afc2af] text-[#4c5f2b]", type: "initials" },
    { id: "preset:midnight-pearl", label: "Midnight Pearl", bg: "from-[#eef3f7] to-[#c1d3df] border-[#a9c0d1] text-[#2c435a]", type: "initials" },
    { id: "preset:crown", label: "Crown Logo", bg: "from-[#f7f3e8] to-[#dfcfab] border-[#cfbb8c] text-[#826127]", type: "icon", icon: Crown },
    { id: "preset:gem", label: "Rose Gem", bg: "from-[#faf0ec] to-[#e8c8bd] border-[#dcaba0] text-[#854d3d]", type: "icon", icon: Gem },
    { id: "preset:sparkles", label: "Sparkles", bg: "from-[#fdf0e6] to-[#fadcc6] border-[#f4be99] text-[#b35919]", type: "icon", icon: Sparkles },
    { id: "preset:star", label: "Magic Star", bg: "from-[#f8eff2] to-[#e4becf] border-[#d8a3be] text-[#823055]", type: "icon", icon: Star },
    { id: "preset:heart", label: "Red Heart", bg: "from-[#faf0ec] to-[#e8c8bd] border-[#dcaba0] text-[#c93b3b]", type: "icon", icon: Heart },
  ];

  // Helper to extract initials for the preset preview button
  const getInitials = (n: string) => {
    if (n && n.trim()) {
      const parts = n.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return n.trim().slice(0, 2).toUpperCase();
    }
    const cleanPhone = user.phoneNumber.replace(/\D/g, "");
    return cleanPhone.slice(-2) || "U";
  };

  const handleAvatarSelect = (presetId: string) => {
    setSelectedAvatar(presetId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    // Front-end validations
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
      // Determine final avatar value based on mode
      const finalAvatar = avatarMode === "custom" ? (customAvatarUrl.trim() || null) : (selectedAvatar || null);

      const res = await updateUserProfile({
        name: name.trim(),
        email: email.trim() || null,
        whatsappNumber: whatsappNumber.trim() || null,
        image: finalAvatar,
        marketingConsent,
      });

      if (res.success) {
        setSuccessMessage("Your profile information has been updated successfully.");
        setShowAvatarPicker(false);
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

  const currentPreviewAvatar = avatarMode === "custom" ? customAvatarUrl : selectedAvatar;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold text-foreground tracking-wide flex items-center gap-2">
          Profile Settings
        </h2>
        <p className="text-xs text-muted-foreground font-light">
          Manage your personal details, contact coordinates, and signature avatar.
        </p>
      </div>

      {/* Main Alert Banners */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl flex items-start gap-3 text-xs animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
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
        <div className="bg-card border border-border/30 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
          <button
            type="button"
            onClick={() => setShowAvatarPicker(true)}
            className="relative group shrink-0 cursor-pointer focus:outline-none"
            title="Click to customize avatar"
          >
            <UserAvatar
              image={currentPreviewAvatar || null}
              name={name || "U"}
              phone={user.phoneNumber}
              className="w-20 h-20 md:w-24 md:h-24 rounded-3xl shadow-md border-2 border-primary/10 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-xl shadow-lg border border-background">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </button>

          <div className="text-center md:text-left space-y-3 flex-1">
            <h3 className="font-serif text-base font-semibold text-foreground">Your Signature Avatar</h3>
            <p className="text-xs text-muted-foreground font-light max-w-md">
              Choose one of our premium rosewood gradient presets or paste a custom image URL to personalize your portal shell.
            </p>
            <button
              type="button"
              onClick={() => setShowAvatarPicker(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-secondary/30 text-foreground hover:bg-secondary/60 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Change Avatar <Sparkles className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
        </div>

        {/* Avatar Picker Modal Overlay */}
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
            <div 
              className="bg-card border border-border/40 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-3 border-b border-border/20">
                <h3 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary shrink-0 animate-pulse" />
                  Select Profile Avatar
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-6">
                {/* Mode Toggle */}
                <div className="flex p-1 border border-border bg-secondary/15 rounded-2xl w-fit">
                  <button
                    type="button"
                    onClick={() => setAvatarMode("preset")}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      avatarMode === "preset"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Signature Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarMode("custom")}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      avatarMode === "custom"
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Custom Image URL
                  </button>
                </div>

                {avatarMode === "preset" ? (
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                      Select a Curated Preset
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                      {PRESET_AVATARS.map((p) => {
                        const isSelected = selectedAvatar === p.id;
                        const Icon = p.icon;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleAvatarSelect(p.id)}
                            className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center p-3 transition-all duration-200 group cursor-pointer ${
                              isSelected
                                ? "border-primary ring-2 ring-primary/45 scale-[1.03] shadow-md bg-secondary/40"
                                : "border-border/30 hover:border-primary/40 hover:scale-[1.01] hover:bg-secondary/10"
                            }`}
                          >
                            {/* Avatar Render */}
                            <div
                              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.bg} border border-border/20 flex items-center justify-center font-serif text-sm font-bold shadow-inner shrink-0`}
                            >
                              {Icon ? (
                                <Icon className="w-5 h-5 stroke-[2] fill-current" />
                              ) : (
                                getInitials(name)
                              )}
                            </div>
                            <span className="text-[9px] font-medium text-foreground mt-2 text-center truncate w-full">
                              {p.label}
                            </span>

                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-primary flex items-center justify-center border border-background">
                                <span className="block w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground/75">
                      Avatar Image Web Link
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/photo-..."
                          value={customAvatarUrl}
                          onChange={(e) => setCustomAvatarUrl(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-border bg-secondary/20 text-foreground text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomAvatarUrl("")}
                        className="px-3.5 py-2 bg-secondary border border-border text-foreground hover:bg-secondary/60 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-light">
                      Paste the URL of any image (PNG, JPG, WebP) hosted online. Fallbacks automatically resolve to initials if loading fails.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border/20">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(user.image || "");
                    setCustomAvatarUrl(user.image && !user.image.startsWith("preset:") ? user.image : "");
                    setAvatarMode(user.image && !user.image.startsWith("preset:") ? "custom" : "preset");
                    setShowAvatarPicker(false);
                  }}
                  className="px-4 py-2.5 border border-border text-foreground hover:bg-secondary/40 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Confirm Avatar
                </button>
              </div>
            </div>
          </div>
        )}

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
              <span className="text-[9px] uppercase font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 select-none">
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
              setSelectedAvatar(user.image || "");
              setMarketingConsent(user.marketingConsent);
              setCustomAvatarUrl(user.image && !user.image.startsWith("preset:") ? user.image : "");
              setAvatarMode(user.image && !user.image.startsWith("preset:") ? "custom" : "preset");
              setSuccessMessage("");
              setErrorMessage("");
              setShowAvatarPicker(false);
            }}
            className="px-6 py-3 border border-border text-foreground hover:bg-secondary/40 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset Form
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/10 transition-all cursor-pointer disabled:bg-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
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
