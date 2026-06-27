import { getPublicIdFromUrl } from "./utils";

export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  if (!src) return "";

  // 1. If it's a local static image or an external image not from Cloudinary, return it as-is.
  const isCloudinary = src.includes("res.cloudinary.com");
  const isPublicId = !src.startsWith("/") && !src.startsWith("http");

  if (!isCloudinary && !isPublicId) {
    return src;
  }

  // 2. Parse query parameters if any (e.g. src="image?crop=fill&g=face")
  let cleanSrc = src;
  let queryParams: Record<string, string> = {};

  if (src.includes("?")) {
    const parts = src.split("?");
    cleanSrc = parts[0];
    const searchParams = new URLSearchParams(parts[1]);
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
  }

  // 3. Extract cloud name and public ID
  let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dwrxo4hvx";
  let publicId = cleanSrc;

  if (cleanSrc.startsWith("http")) {
    const cloudNameMatch = cleanSrc.match(/res\.cloudinary\.com\/([^/]+)/);
    if (cloudNameMatch) {
      cloudName = cloudNameMatch[1];
    }
    const extracted = getPublicIdFromUrl(cleanSrc);
    if (extracted) {
      publicId = extracted;
    } else {
      // Fallback: If it is a Cloudinary URL but we couldn't extract public ID, return as-is
      return src;
    }
  }

  // Remove leading slash if any
  publicId = publicId.replace(/^\//, "");

  // 4. Construct transformations
  const crop = queryParams.crop || queryParams.c || "limit";
  const gravity = queryParams.gravity || queryParams.g || "auto";
  const blur = queryParams.blur || queryParams.e_blur;
  const dpr = queryParams.dpr || "auto";
  const height = queryParams.height || queryParams.h;
  const format = queryParams.format || queryParams.f || "auto";
  const qualityVal = queryParams.quality || queryParams.q || (quality ? String(quality) : "auto");

  const transforms: string[] = [];
  transforms.push(`f_${format}`);
  transforms.push(`q_${qualityVal}`);
  transforms.push(`w_${width}`);
  
  if (height) {
    transforms.push(`h_${height}`);
  }
  
  // Use crop
  transforms.push(`c_${crop}`);
  
  // Gravity applies if crop is fill, thumb, crop, etc.
  if (crop === "fill" || crop === "thumb" || crop === "crop") {
    transforms.push(`g_${gravity}`);
  }

  if (blur) {
    transforms.push(`e_blur:${blur}`);
  }

  if (dpr) {
    transforms.push(`dpr_${dpr}`);
  }

  const transformString = transforms.join(",");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
}
