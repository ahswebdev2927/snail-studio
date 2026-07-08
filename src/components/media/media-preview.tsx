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
    <div className={`relative flex items-center gap-3 p-2 rounded-lg border border-border bg-card group shadow-sm ${className}`}>
      <div className="relative w-12 h-12 flex-shrink-0 bg-secondary-surface rounded overflow-hidden">
        {item.resourceType === "image" ? (
          <CloudinaryImage
            src={item.url}
            variant="thumbnail"
            alt={item.altText || item.fileName || "Media Thumbnail"}
            className="w-full h-full"
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-primary/5 dark:bg-primary/10">
            <Film className="w-5 h-5 text-primary" />
            {item.duration ? (
              <span className="absolute bottom-0 right-0 px-1 bg-[#181311]/85 text-[10px] text-primary-soft rounded font-mono">
                {`${item.duration.toFixed(1)}s`}
              </span>
            ) : (
              <span className="absolute bottom-0 right-0 px-1 bg-[#181311]/85 text-[10px] text-primary-soft rounded font-mono">
                video
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <h4 className="text-sm font-medium text-text-heading truncate" title={item.fileName || ""}>
          {item.fileName || item.publicId.split("/").pop() || "Unnamed Asset"}
        </h4>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
          <span>{formatBytes(item.fileSize)}</span>
          {item.width && item.height && (
            <>
              <span className="text-border">•</span>
              <span>{`${item.width}x${item.height}`}</span>
            </>
          )}
          {item.format && (
            <>
              <span className="text-border">•</span>
              <span className="uppercase">{item.format}</span>
            </>
          )}
        </div>
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(item.id)}
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:text-destructive border border-destructive/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          title="Remove media"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default MediaPreview;
