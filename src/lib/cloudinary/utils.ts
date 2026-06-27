/**
 * Utility functions for generating optimized Cloudinary URLs and transforming media.
 * These are environment-agnostic and client-safe (do not require the private API Secret).
 */

export function getPublicIdFromUrl(url: string): string | null {
  if (!url) return null;

  const imageMatch = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
  const videoMatch = url.match(/\/video\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);

  const match = imageMatch || videoMatch;
  return match ? match[1] : null;
}

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  crop?: "scale" | "fill" | "thumb" | "crop" | "limit";
  quality?: "auto" | "good" | "eco" | "low" | string;
  format?: "auto" | "webp" | "jpg" | "png" | string;
  dpr?: string | number;
  gravity?: string;
  blur?: string | number;
}

/**
 * Returns an optimized image URL from a public ID or full Cloudinary URL.
 */
export function getOptimizedImageUrl(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  if (!src) return "";

  let publicId = src;
  let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dwrxo4hvx";

  if (src.startsWith("http")) {
    const cloudNameMatch = src.match(/res\.cloudinary\.com\/([^/]+)/);
    if (cloudNameMatch) {
      cloudName = cloudNameMatch[1];
    }
    const extracted = getPublicIdFromUrl(src);
    if (!extracted) return src; // Fallback to original URL if extraction fails
    publicId = extracted;
  }

  const {
    width,
    height,
    crop = "scale",
    quality = "auto",
    format = "auto",
    dpr,
    gravity,
    blur,
  } = options;

  const transforms: string[] = [];
  transforms.push(`f_${format}`);
  transforms.push(`q_${quality}`);

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);
  if (gravity && (crop === "fill" || crop === "thumb" || crop === "crop")) {
    transforms.push(`g_${gravity}`);
  }
  if (blur) transforms.push(`e_blur:${blur}`);
  if (dpr) transforms.push(`dpr_${dpr}`);

  const transformString = transforms.join(",");
  const cleanPublicId = publicId.replace(/^\//, "");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${cleanPublicId}`;
}

/**
 * Generates a low-quality, highly compressed, and blurred image URL to use as a placeholder.
 */
export function getBlurPlaceholderUrl(src: string): string {
  if (!src) return "";

  let publicId = src;
  let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dwrxo4hvx";

  if (src.startsWith("http")) {
    const cloudNameMatch = src.match(/res\.cloudinary\.com\/([^/]+)/);
    if (cloudNameMatch) {
      cloudName = cloudNameMatch[1];
    }
    const extracted = getPublicIdFromUrl(src);
    if (!extracted) return src; // Fallback
    publicId = extracted;
  } else if (src.startsWith("/")) {
    // Local image, cannot generate Cloudinary blur placeholder easily.
    return src;
  }

  const cleanPublicId = publicId.replace(/^\//, "");

  // Cloudinary transformations for a small blurred image placeholder:
  // w_40: small width
  // q_auto:eco: low quality
  // e_blur:1000: max blur
  // f_auto: automatic format
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_40,q_auto:eco,e_blur:1000,f_auto/${cleanPublicId}`;
}

interface VideoOptimizationOptions {
  width?: number;
  height?: number;
  crop?: "scale" | "fill" | "crop";
  quality?: "auto" | "good" | "eco";
  format?: "auto" | "mp4" | "webm";
}

/**
 * Returns an optimized video URL from a public ID or full Cloudinary URL.
 */
export function getOptimizedVideoUrl(
  src: string,
  options: VideoOptimizationOptions = {}
): string {
  if (!src) return "";

  let publicId = src;
  let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dwrxo4hvx";

  if (src.startsWith("http")) {
    const cloudNameMatch = src.match(/res\.cloudinary\.com\/([^/]+)/);
    if (cloudNameMatch) {
      cloudName = cloudNameMatch[1];
    }
    const extracted = getPublicIdFromUrl(src);
    if (!extracted) return src;
    publicId = extracted;
  }

  const {
    width,
    height,
    crop = "scale",
    quality = "auto",
    format = "auto",
  } = options;

  const transforms: string[] = [];
  transforms.push(`f_${format}`);
  transforms.push(`q_${quality}`);

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const transformString = transforms.join(",");
  const cleanPublicId = publicId.replace(/^\//, "");

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformString}/${cleanPublicId}`;
}

/**
 * Generates a video poster URL (first frame representation) from a video URL or public ID.
 */
export function getVideoPosterUrl(
  src: string,
  options: { width?: number; height?: number; crop?: "scale" | "fill" | "crop" } = {}
): string {
  if (!src) return "";

  let publicId = src;
  let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dwrxo4hvx";

  if (src.startsWith("http")) {
    const cloudNameMatch = src.match(/res\.cloudinary\.com\/([^/]+)/);
    if (cloudNameMatch) {
      cloudName = cloudNameMatch[1];
    }
    const extracted = getPublicIdFromUrl(src);
    if (!extracted) return src;
    publicId = extracted;
  }

  const { width, height, crop = "scale" } = options;

  const transforms: string[] = ["f_jpg", "q_auto", "so_auto"];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const transformString = transforms.join(",");
  const cleanPublicId = publicId.replace(/^\//, "");

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformString}/${cleanPublicId}.jpg`;
}
