import { cloudinary } from "./client";
import { CloudinaryFolder, CloudinaryUploadResult } from "./types";

/**
 * Deletes an asset from Cloudinary by its public ID.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<{ result: string }> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error(`Failed to delete asset ${publicId} from Cloudinary:`, error);
    throw error;
  }
}

/**
 * Uploads a file (from a server path, URL, or buffer) directly to Cloudinary from the server.
 * This is useful for seeds, mock data setup, or background processing where file uploads
 * originate from the server.
 */
export async function uploadFromServer(
  fileSource: string | Buffer,
  folder: CloudinaryFolder,
  resourceType: "image" | "video" = "image"
): Promise<CloudinaryUploadResult> {
  try {
    let uploadPreset = "";
    switch (folder) {
      case "products/images":
        uploadPreset = process.env.CLOUDINARY_PRESET_PRODUCT_IMAGE || "";
        break;
      case "products/videos":
        uploadPreset = process.env.CLOUDINARY_PRESET_PRODUCT_VIDEO || "";
        break;
      case "collections/banners":
        uploadPreset = process.env.CLOUDINARY_PRESET_COLLECTION_BANNER || "";
        break;
      case "categories/banners":
        uploadPreset = process.env.CLOUDINARY_PRESET_CATEGORY_BANNER || "";
        break;
      default:
        throw new Error(`Unsupported upload folder: ${folder}`);
    }

    const options: any = {
      folder,
      resource_type: resourceType,
    };

    if (uploadPreset) {
      options.upload_preset = uploadPreset;
    }

    let result: any;
    if (Buffer.isBuffer(fileSource)) {
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          options,
          (error, res) => {
            if (error) reject(error);
            else resolve(res);
          }
        );
        uploadStream.end(fileSource);
      });
    } else {
      result = await cloudinary.uploader.upload(fileSource, options);
    }

    return result as CloudinaryUploadResult;
  } catch (error) {
    console.error("Failed to upload asset from server to Cloudinary:", error);
    throw error;
  }
}
