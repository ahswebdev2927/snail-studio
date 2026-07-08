"use client";

import React, { useState, useEffect } from "react";
import { CloudinaryImage } from "./cloudinary-image";
import { Search, Upload, Check, Loader2, X, Film } from "lucide-react";

interface MediaItem {
  id: string;
  url: string;
  publicId: string;
  fileName: string | null;
  fileSize: number | null;
  format: string | null;
  width: number | null;
  height: number | null;
  resourceType: "image" | "video";
  duration: number | null;
  folder: string | null;
  altText: string | null;
}

interface MediaPickerProps {
  onSelect: (selected: MediaItem[]) => void;
  onClose?: () => void;
  maxSelection?: number;
  initialSelectionIds?: string[];
  title?: string;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  onSelect,
  onClose,
  maxSelection = 1,
  initialSelectionIds = [],
  title = "Select Media",
}) => {
  const [activeTab, setActiveTab] = useState<"select" | "upload">("select");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [resourceType, setResourceType] = useState<"all" | "image" | "video">("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolder, setUploadFolder] = useState<
    "products/images" | "products/videos" | "collections/banners" | "categories/banners" | "store/logo"
  >("products/images");
  const [altText, setAltText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (resourceType !== "all") queryParams.append("resourceType", resourceType);
      if (folderFilter !== "all") queryParams.append("folder", folderFilter);

      const res = await fetch(`/api/media?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data);

        if (initialSelectionIds.length > 0) {
          const matched = data.filter((item: MediaItem) => initialSelectionIds.includes(item.id));
          setSelectedItems(matched);
        }
      }
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "select") {
      fetchMedia();
    }
  }, [activeTab, resourceType, folderFilter]);

  const handleSelectItem = (item: MediaItem) => {
    if (maxSelection === 1) {
      setSelectedItems([item]);
    } else {
      const exists = selectedItems.find((selected) => selected.id === item.id);
      if (exists) {
        setSelectedItems(selectedItems.filter((selected) => selected.id !== item.id));
      } else if (selectedItems.length < maxSelection) {
        setSelectedItems([...selectedItems, item]);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select a file to upload.");
      return;
    }

    setUploadError("");
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileType = uploadFile.type.startsWith("video/") ? "video" : "image";

      if (uploadFolder === "products/videos" && fileType !== "video") {
        throw new Error("Folder 'products/videos' requires a video file.");
      }
      if (uploadFolder !== "products/videos" && fileType !== "image") {
        throw new Error("Target folder requires an image file.");
      }

      const signRes = await fetch("/api/media/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: uploadFolder,
          resourceType: fileType,
          fileSize: uploadFile.size,
          mimeType: uploadFile.type,
        }),
      });

      if (!signRes.ok) {
        const errData = await signRes.json();
        throw new Error(errData.error || "Failed to generate upload signature.");
      }

      const signData = await signRes.json();

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("api_key", signData.apiKey);
      formData.append("timestamp", signData.timestamp.toString());
      formData.append("signature", signData.signature);
      formData.append("folder", signData.folder);
      if (signData.uploadPreset) {
        formData.append("upload_preset", signData.uploadPreset);
      }

      const cloudUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/${fileType}/upload`;
      
      const cloudData = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", cloudUrl, true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve(res);
            } catch (err) {
              reject(new Error("Failed to parse Cloudinary response."));
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText);
              reject(new Error(res.error?.message || "Failed to upload file to Cloudinary."));
            } catch {
              reject(new Error("Failed to upload file to Cloudinary."));
            }
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during Cloudinary upload."));
        };

        xhr.send(formData);
      });

      const regRes = await fetch("/api/media/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cloudData.secure_url,
          publicId: cloudData.public_id,
          fileName: uploadFile.name,
          fileSize: cloudData.bytes,
          format: cloudData.format,
          width: cloudData.width || null,
          height: cloudData.height || null,
          resourceType: fileType,
          duration: cloudData.duration || null,
          folder: uploadFolder,
          altText: altText || null,
        }),
      });

      if (!regRes.ok) {
        throw new Error("Uploaded successfully, but failed to sync metadata in database.");
      }

      const registeredMedia = await regRes.json();

      if (maxSelection === 1) {
        setSelectedItems([registeredMedia]);
      } else if (selectedItems.length < maxSelection) {
        setSelectedItems([...selectedItems, registeredMedia]);
      }

      setUploadFile(null);
      setAltText("");
      setActiveTab("select");
      await fetchMedia();

    } catch (err: any) {
      setUploadError(err.message || "Something went wrong during upload.");
      
      // Report upload failure to backend to generate system notification
      try {
        fetch("/api/media/report-failure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: err.message || "Failed upload",
            fileName: uploadFile?.name,
            folder: uploadFolder,
          })
        });
      } catch (reportErr) {
        console.error("Failed to report media picker upload failure:", reportErr);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedItems);
    if (onClose) onClose();
  };

  const filteredItems = mediaItems.filter((item) =>
    (item.fileName || "").toLowerCase().includes(search.toLowerCase()) ||
    item.publicId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl bg-card text-foreground border border-border rounded-2xl shadow-xl overflow-hidden font-sans">
      <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-secondary/20">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex px-6 border-b border-border/40">
        <button
          onClick={() => setActiveTab("select")}
          className={`py-3 px-4 border-b-2 text-sm font-medium transition-all duration-200 ${
            activeTab === "select"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Select Existing
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`py-3 px-4 border-b-2 text-sm font-medium transition-all duration-200 ${
            activeTab === "upload"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Upload New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {activeTab === "select" ? (
          <div className="flex flex-col gap-4 h-full min-h-0">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-border bg-secondary/30 text-foreground text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 border border-border rounded-xl bg-secondary/20">
                <button
                  onClick={() => setResourceType("all")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg ${
                    resourceType === "all"
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setResourceType("image")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg ${
                    resourceType === "image"
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Images
                </button>
                <button
                  onClick={() => setResourceType("video")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg ${
                    resourceType === "video"
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  Videos
                </button>
              </div>

              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="px-3 py-2 border border-border bg-secondary/30 text-foreground text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all" className="bg-card text-foreground">All Folders</option>
                <option value="products/images" className="bg-card text-foreground">Product Images</option>
                <option value="products/videos" className="bg-card text-foreground">Product Videos</option>
                <option value="collections/banners" className="bg-card text-foreground">Collection Banners</option>
                <option value="categories/banners" className="bg-card text-foreground">Category Banners</option>
                <option value="store/logo" className="bg-card text-foreground">Store Logos</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-text-muted">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span>Loading registered media items...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border/40 rounded-xl text-text-muted">
                  <span>No media items found matching filters</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {filteredItems.map((item) => {
                    const isSelected = selectedItems.some((sel) => sel.id === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        className={`relative aspect-square w-full rounded-xl border overflow-hidden transition-all duration-200 ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-border/40 hover:border-primary/50"
                        }`}
                      >
                        {item.resourceType === "image" ? (
                          <CloudinaryImage
                            src={item.url}
                            variant="thumbnail"
                            alt={item.altText || "Thumbnail"}
                            className="w-full h-full rounded-none"
                          />
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center bg-primary/5 dark:bg-primary/10">
                            <Film className="w-8 h-8 text-primary" />
                            {item.duration && (
                              <span className="absolute bottom-1 right-1 px-1 bg-[#181311]/85 text-[9px] text-primary-soft rounded font-mono">
                                {`${item.duration.toFixed(0)}s`}
                              </span>
                            )}
                          </div>
                        )}

                        {isSelected && (
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground shadow-md border border-white">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="flex flex-col gap-5 max-w-lg mx-auto">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-2xl p-6 bg-secondary-surface/40 hover:border-primary/60 transition-all duration-200 relative cursor-pointer group">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                disabled={isUploading}
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Upload className="w-10 h-10 text-text-muted group-hover:text-primary transition-colors duration-200 mb-2" />
              {uploadFile ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-body truncate max-w-xs">
                    {uploadFile.name}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-text-body">
                    Click to select file or drag & drop here
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    JPEG, PNG, WebP (Max 10MB) or MP4, WebM (Max 50MB)
                  </p>
                </div>
              )}
            </div>

            {uploadProgress !== null && (
              <div className="w-full space-y-1.5 animate-fade-in bg-secondary/15 border border-border/40 p-3.5 rounded-2xl">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span className="truncate max-w-[80%]">{uploadFile?.name}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-secondary/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
 
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80">
                Destination Folder
              </label>
              <select
                value={uploadFolder}
                onChange={(e: any) => setUploadFolder(e.target.value)}
                disabled={isUploading}
                className="w-full px-4 py-2 border border-border bg-secondary/30 text-foreground text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="products/images" className="bg-card text-foreground">Product Images</option>
                <option value="products/videos" className="bg-card text-foreground">Product Videos</option>
                <option value="collections/banners" className="bg-card text-foreground">Collection Banners</option>
                <option value="categories/banners" className="bg-card text-foreground">Category Banners</option>
                <option value="store/logo" className="bg-card text-foreground">Store Logos</option>
              </select>
            </div>
 
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground/80">
                Alt Text (SEO & Accessibility)
              </label>
              <input
                type="text"
                placeholder="Describe this media..."
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                disabled={isUploading}
                className="w-full px-4 py-2 border border-border bg-secondary/30 text-foreground text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {uploadError && (
              <p className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                {uploadError}
              </p>
            )}

            <button
              type="submit"
              disabled={isUploading || !uploadFile}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/95 disabled:bg-muted disabled:text-text-disabled disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Uploading to Cloudinary...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Start Direct Upload</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <div className="flex justify-between items-center px-6 py-4 border-t border-border/40 bg-secondary/20">
        <span className="text-sm text-muted-foreground">
          {selectedItems.length > 0
            ? `${selectedItems.length} of ${maxSelection} item(s) selected`
            : "No items selected"}
        </span>
        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-xl hover:bg-secondary/40 text-foreground text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={selectedItems.length === 0}
            className="px-5 py-2 bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-text-disabled disabled:cursor-not-allowed text-primary-foreground text-sm font-medium rounded-xl transition-colors duration-200"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaPicker;
