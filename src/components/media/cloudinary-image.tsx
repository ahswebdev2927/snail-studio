"use client";

import React from "react";
import Image, { ImageProps } from "next/image";
import { getBlurPlaceholderUrl } from "@/lib/cloudinary/utils";

export type ImageVariant = "thumbnail" | "card" | "page" | "zoom" | "banner" | "custom";

export interface CloudinaryImageProps extends Omit<ImageProps, "src" | "placeholder" | "blurDataURL"> {
  src: string; // publicId or full secure Cloudinary URL
  variant?: ImageVariant;
  crop?: "scale" | "fill" | "thumb" | "crop" | "limit";
  gravity?: "auto" | "face" | "center" | "north" | "south" | "east" | "west" | string;
  blur?: number | string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  alt: string;
}

export const CloudinaryImage: React.FC<CloudinaryImageProps> = ({
  src,
  variant = "custom",
  crop,
  gravity,
  blur,
  objectFit = "cover",
  width,
  height,
  alt,
  className = "",
  sizes,
  fill,
  ...props
}) => {
  let widthOpt: number | undefined = width ? Number(width) : undefined;
  let heightOpt: number | undefined = height ? Number(height) : undefined;
  let cropOpt = crop;

  switch (variant) {
    case "thumbnail":
      widthOpt = widthOpt || 200;
      heightOpt = heightOpt || 200;
      cropOpt = cropOpt || "fill";
      break;
    case "card":
      widthOpt = widthOpt || 400;
      heightOpt = heightOpt || 400;
      cropOpt = cropOpt || "fill";
      break;
    case "page":
      widthOpt = widthOpt || 800;
      heightOpt = heightOpt || 800;
      cropOpt = cropOpt || "fill";
      break;
    case "zoom":
      widthOpt = widthOpt || 1200;
      heightOpt = heightOpt || 1200;
      cropOpt = cropOpt || "fill";
      break;
    case "banner":
      widthOpt = widthOpt || 1920;
      heightOpt = heightOpt || 800;
      cropOpt = cropOpt || "fill";
      break;
  }

  // Determine whether to use absolute layout (fill) or fixed dimensions
  const useFill = fill !== undefined ? fill : (!widthOpt && !heightOpt);

  // Construct query params to pass configuration to the custom loader
  const queryParams = new URLSearchParams();
  if (cropOpt) queryParams.set("crop", cropOpt);
  if (gravity) queryParams.set("gravity", gravity);
  if (blur) queryParams.set("blur", String(blur));
  if (heightOpt && !useFill) queryParams.set("height", String(heightOpt));

  const queryString = queryParams.toString();
  const srcWithParams = queryString ? `${src}?${queryString}` : src;

  // Generate blur placeholder URL for Cloudinary images
  const isCloudinary = src && (src.includes("res.cloudinary.com") || (!src.startsWith("/") && !src.startsWith("http")));
  const blurUrl = isCloudinary ? getBlurPlaceholderUrl(src) : undefined;

  const objectFitClass = 
    objectFit === "cover" ? "object-cover" :
    objectFit === "contain" ? "object-contain" :
    objectFit === "fill" ? "object-fill" :
    objectFit === "scale-down" ? "object-scale-down" : "object-none";

  return (
    <div className={`relative overflow-hidden bg-rose-50/50 dark:bg-neutral-900/40 rounded-lg ${className}`}>
      <Image
        src={srcWithParams}
        alt={alt}
        width={useFill ? undefined : widthOpt}
        height={useFill ? undefined : heightOpt}
        fill={useFill}
        sizes={sizes || (useFill ? "100vw" : undefined)}
        placeholder={blurUrl ? "blur" : "empty"}
        blurDataURL={blurUrl}
        className={`w-full h-full transition-opacity duration-500 ease-out ${objectFitClass}`}
        {...props}
      />
    </div>
  );
};

export default CloudinaryImage;
