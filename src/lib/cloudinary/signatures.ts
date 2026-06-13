import { cloudinary } from "./client";
import { CloudinaryFolder, CloudinaryResourceType, SignedUploadResponse } from "./types";

/**
 * Generates a secure signature for direct client-side uploads to Cloudinary.
 * The client must use the returned parameters exactly as specified to upload successfully.
 */
export function generateUploadSignature(
  folder: CloudinaryFolder,
  resourceType: CloudinaryResourceType
): SignedUploadResponse {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Map the folder/resourceType to its corresponding upload preset
  let uploadPreset = "";
  switch (folder) {
    case "products/images":
      uploadPreset = process.env.CLOUDINARY_PRESET_PRODUCT_IMAGE || "product_images";
      break;
    case "products/videos":
      uploadPreset = process.env.CLOUDINARY_PRESET_PRODUCT_VIDEO || "product_videos";
      break;
    case "collections/banners":
      uploadPreset = process.env.CLOUDINARY_PRESET_COLLECTION_BANNER || "collection_banners";
      break;
    case "categories/banners":
      uploadPreset = process.env.CLOUDINARY_PRESET_CATEGORY_BANNER || "category_banners";
      break;
    default:
      throw new Error(`Unsupported upload folder: ${folder}`);
  }

  // Parameters to sign (must match exactly what the client sends)
  const paramsToSign = {
    timestamp,
    folder,
    upload_preset: uploadPreset,
  };

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    throw new Error("CLOUDINARY_API_SECRET is not configured");
  }

  // Generate signature using Cloudinary SDK helper
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    signature,
    timestamp,
    apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    folder,
    uploadPreset,
  };
}
