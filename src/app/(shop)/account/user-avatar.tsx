"use client";

import React, { useState } from "react";
import { Crown, Gem, Sparkles, Star, Heart } from "lucide-react";
import CloudinaryImage from "@/components/media/cloudinary-image";

export interface UserAvatarProps {
  image: string | null;
  name: string | null;
  phone: string;
  className?: string;
}

export function UserAvatar({
  image,
  name,
  phone,
  className = "w-12 h-12 rounded-2xl"
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Helper to extract initials
  const getInitials = (n: string | null, p: string) => {
    if (n && n.trim()) {
      const parts = n.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return n.trim().slice(0, 2).toUpperCase();
    }
    // Fallback to last 2 digits of phone number
    const cleanPhone = p.replace(/\D/g, "");
    return cleanPhone.slice(-2) || "U";
  };

  // If no image is provided or loading failed, display standard initials with neutral gradient
  if (!image || hasError) {
    return (
      <div
        className={`${className} bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center font-serif font-bold text-primary shrink-0 select-none`}
      >
        {getInitials(name, phone)}
      </div>
    );
  }

  // Handle local preset avatars
  if (image.startsWith("preset:")) {
    const preset = image.substring(7); // Extract key after 'preset:'
    
    // Default fallback styles
    let gradientClass = "from-primary/20 to-accent/20 border-primary/20 text-primary";
    let iconElement: React.ReactNode = <span>{getInitials(name, phone)}</span>;

    // Apply specific preset styles
    if (preset.includes("cream-rose")) {
      gradientClass = "from-background to-primary-soft border-primary-light/40 text-primary";
    } else if (preset.includes("champagne-gold")) {
      gradientClass = "from-secondary-surface to-warning border-warning/40 text-secondary";
    } else if (preset.includes("velvet-plum")) {
      gradientClass = "from-secondary-surface to-primary-light border-primary-light/40 text-text-heading";
    } else if (preset.includes("soft-sage")) {
      gradientClass = "from-background to-success border-success/40 text-text-body";
    } else if (preset.includes("midnight-pearl")) {
      gradientClass = "from-background to-info border-info/40 text-text-heading";
    }

    // Determine content: icon vs initials
    if (preset.endsWith("-crown") || preset === "crown") {
      iconElement = <Crown className="w-1/2 h-1/2 stroke-[2]" />;
    } else if (preset.endsWith("-gem") || preset === "gem") {
      iconElement = <Gem className="w-1/2 h-1/2 stroke-[2]" />;
    } else if (preset.endsWith("-sparkles") || preset === "sparkles") {
      iconElement = <Sparkles className="w-1/2 h-1/2 stroke-[2]" />;
    } else if (preset.endsWith("-star") || preset === "star") {
      iconElement = <Star className="w-1/2 h-1/2 stroke-[2]" />;
    } else if (preset.endsWith("-heart") || preset === "heart") {
      iconElement = <Heart className="w-1/2 h-1/2 stroke-[2] fill-current" />;
    }

    return (
      <div
        className={`${className} bg-gradient-to-br ${gradientClass} border flex items-center justify-center font-serif font-bold shrink-0 select-none`}
      >
        {iconElement}
      </div>
    );
  }

  // Handle external/custom image URL
  return (
    <div className={`${className} border border-border/40 overflow-hidden relative shrink-0 select-none bg-secondary/20`}>
      <CloudinaryImage
        src={image}
        variant="thumbnail"
        alt={name || "User avatar"}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
