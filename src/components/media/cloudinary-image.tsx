"use client";

import React, { useState } from "react";
import { getOptimizedImageUrl } from "@/lib/cloudinary/utils";

type ImageVariant = "thumbnail" | "card" | "page" | "zoom" | "banner" | "custom";

interface CloudinaryImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string; // publicId or full secure Cloudinary URL
  variant?: ImageVariant;
  width?: number;
  height?: number;
  crop?: "scale" | "fill" | "thumb" | "crop";
  alt: string;
}

export const CloudinaryImage: React.FC<CloudinaryImageProps> = ({
  src,
  variant = "custom",
  width,
  height,
  crop = "fill",
  alt,
  className = "",
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  let widthOpt: number | undefined = width;
  let heightOpt: number | undefined = height;
  let cropOpt = crop;

  switch (variant) {
    case "thumbnail":
      widthOpt = 200;
      heightOpt = 200;
      cropOpt = "fill";
      break;
    case "card":
      widthOpt = 400;
      heightOpt = 400;
      cropOpt = "fill";
      break;
    case "page":
      widthOpt = 800;
      heightOpt = 800;
      cropOpt = "fill";
      break;
    case "zoom":
      widthOpt = 1200;
      heightOpt = 1200;
      cropOpt = "fill";
      break;
    case "banner":
      widthOpt = 1920;
      heightOpt = 800;
      cropOpt = "fill";
      break;
  }

  const optimizedUrl = getOptimizedImageUrl(src, {
    width: widthOpt,
    height: heightOpt,
    crop: cropOpt,
  });

  return (
    <div className={`relative overflow-hidden bg-rose-50/50 dark:bg-neutral-900/40 rounded-lg ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse flex items-center justify-center bg-rose-100/50 dark:bg-rose-950/20">
          <div className="w-8 h-8 rounded-full border-2 border-rose-300 border-t-rose-500 animate-spin" />
        </div>
      )}

      <img
        src={optimizedUrl}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ease-out ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        {...props}
      />
    </div>
  );
};
export default CloudinaryImage;
