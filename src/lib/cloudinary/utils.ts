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
  crop?: "scale" | "fill" | "thumb" | "crop";
  quality?: "auto" | "good" | "eco" | "low";
  format?: "auto" | "webp" | "jpg" | "png";
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
  if (src.startsWith("http")) {
    const extracted = getPublicIdFromUrl(src);
    if (!extracted) return src; // Fallback to original URL if extraction fails
    publicId = extracted;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dwrxo4hvx";
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

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${cleanPublicId}`;
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
  if (src.startsWith("http")) {
    const extracted = getPublicIdFromUrl(src);
    if (!extracted) return src;
    publicId = extracted;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dwrxo4hvx";
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
  if (src.startsWith("http")) {
    const extracted = getPublicIdFromUrl(src);
    if (!extracted) return src;
    publicId = extracted;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dwrxo4hvx";
  const { width, height, crop = "scale" } = options;

  const transforms: string[] = ["f_jpg", "q_auto", "so_auto"];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const transformString = transforms.join(",");
  const cleanPublicId = publicId.replace(/^\//, "");

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformString}/${cleanPublicId}.jpg`;
}
