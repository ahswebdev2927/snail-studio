export type CloudinaryFolder =
  | "products/images"
  | "products/videos"
  | "collections/banners"
  | "categories/banners"
  | "reviews/images"
  | "customers/avatars";

export type CloudinaryResourceType = "image" | "video";

export interface SignatureParams extends Record<string, any> {
  timestamp: number;
  folder: string;
  upload_preset?: string;
}

export interface SignedUploadResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadPreset: string;
}

export interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: "image" | "video";
  created_at: string;
  bytes: number;
  type: string;
  url: string;
  secure_url: string;
  duration?: number;
}
