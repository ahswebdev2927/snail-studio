"use client";

import React from "react";
import { CloudinaryImage } from "./cloudinary-image";
import { X, Film } from "lucide-react";

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

interface MediaPreviewProps {
  item: MediaItem;
  onDelete?: (id: string) => void;
  className?: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  item,
  onDelete,
  className = "",
}) => {
  return (
    <div className={`relative flex items-center gap-3 p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 group shadow-sm ${className}`}>
      <div className="relative w-12 h-12 flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden">
        {item.resourceType === "image" ? (
          <CloudinaryImage
            src={item.url}
            variant="thumbnail"
            alt={item.altText || item.fileName || "Media Thumbnail"}
            className="w-full h-full"
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-rose-50/50 dark:bg-rose-950/10">
            <Film className="w-5 h-5 text-rose-500" />
            {item.duration ? (
              <span className="absolute bottom-0 right-0 px-1 bg-black/75 text-[10px] text-white rounded font-mono">
                {`${item.duration.toFixed(1)}s`}
              </span>
            ) : (
              <span className="absolute bottom-0 right-0 px-1 bg-black/75 text-[10px] text-white rounded font-mono">
                video
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <h4 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate" title={item.fileName || ""}>
          {item.fileName || item.publicId.split("/").pop() || "Unnamed Asset"}
        </h4>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          <span>{formatBytes(item.fileSize)}</span>
          {item.width && item.height && (
            <>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span>{`${item.width}x${item.height}`}</span>
            </>
          )}
          {item.format && (
            <>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span className="uppercase">{item.format}</span>
            </>
          )}
        </div>
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(item.id)}
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title="Remove media"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default MediaPreview;
