"use client";

import React, { useState } from "react";
import CloudinaryImage from "@/components/media/cloudinary-image";
import CloudinaryVideo from "@/components/media/cloudinary-video";
import ProductGallery from "@/components/media/product-gallery";
import MediaPreview from "@/components/media/media-preview";
import MediaPicker from "@/components/media/media-picker";
import { Image, Video, Sparkles, Folder, Eye, Upload } from "lucide-react";

export default function TestMediaPage() {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  const mockMediaList = [
    {
      id: "mock-1",
      url: "https://res.cloudinary.com/demo/image/upload/v1577836800/sample.jpg",
      publicId: "sample",
      resourceType: "image" as const,
      altText: "Premium Pink Glitter Nails Showcase",
    },
    {
      id: "mock-2",
      url: "https://res.cloudinary.com/demo/image/upload/v1577836800/couple.jpg",
      publicId: "couple",
      resourceType: "image" as const,
      altText: "Bridal Press-On Nails Set Details",
    },
    {
      id: "mock-3",
      url: "https://res.cloudinary.com/demo/video/upload/v1577836800/dog.mp4",
      publicId: "dog",
      resourceType: "video" as const,
      altText: "Video demo of nail adhesive application",
    },
    {
      id: "mock-4",
      url: "https://res.cloudinary.com/demo/image/upload/v1577836800/yellow-tulip.jpg",
      publicId: "yellow-tulip",
      resourceType: "image" as const,
      altText: "Summer Matte Yellow Nails Variant",
    }
  ];

  return (
    <div className="min-h-screen bg-rose-50/15 dark:bg-neutral-950 p-6 md:p-12 font-sans selection:bg-rose-200/50">
      <div className="max-w-6xl mx-auto flex flex-col gap-12">

        <div className="flex flex-col gap-2 border-b border-rose-100 dark:border-neutral-900 pb-6">
          <div className="flex items-center gap-2 text-rose-500 font-semibold tracking-wider text-xs uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Snail Studio Media Engine</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-800 dark:text-white tracking-tight">
            Media Optimization & Utilities
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-xl text-sm leading-relaxed">
            Verify the Cloudinary service layer integration, responsive image transformations, scroll-based autoplay video elements, magnifier galleries, and the direct browser uploader.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-900/50 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-white flex items-center gap-2">
              <Image className="w-5 h-5 text-rose-500" />
              <span>Optimized Image Presets</span>
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
              Image sizes are optimized on Cloudinary edge servers utilizing f_auto and q_auto parameters.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-semibold text-neutral-400">Thumbnail (200x200)</span>
                <CloudinaryImage
                  src="https://res.cloudinary.com/demo/image/upload/v1577836800/sample.jpg"
                  variant="thumbnail"
                  alt="Thumbnail"
                  className="aspect-square w-full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-semibold text-neutral-400">Product Card (400x400)</span>
                <CloudinaryImage
                  src="https://res.cloudinary.com/demo/image/upload/v1577836800/sample.jpg"
                  variant="card"
                  alt="Card"
                  className="aspect-square w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-900/50 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-rose-500" />
              <span>Scroll-Autoplay Video & Poster</span>
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
              Videos are optimized dynamically. The poster frame is extracted from the video stream automatically.
            </p>
            <CloudinaryVideo
              src="https://res.cloudinary.com/demo/video/upload/v1577836800/dog.mp4"
              width={600}
              height={400}
              crop="fill"
              className="w-full aspect-video"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="flex flex-col gap-4 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-900/50 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-rose-500" />
              <span>Product Gallery (Magnifier)</span>
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-4">
              Hover over the main image to trigger a smooth cursor-focused magnification effect.
            </p>
            <ProductGallery mediaList={mockMediaList} />
          </div>

          <div className="flex flex-col gap-4 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-900 bg-white dark:bg-neutral-900/50 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-rose-500" />
              <span>Admin Media Picker Modal</span>
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-4">
              Click the button to open the media picker window. You can view existing files, filter them, or perform direct-to-cloud uploads.
            </p>

            <button
              onClick={() => setShowPicker(true)}
              className="py-3 px-5 bg-rose-500 hover:bg-rose-600 transition-colors text-white font-medium rounded-xl text-sm shadow-md flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Open Media Picker</span>
            </button>

            {selectedItems.length > 0 && (
              <div className="flex flex-col gap-3 mt-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Confirmed Selection:
                </h3>
                {selectedItems.map((item) => (
                  <MediaPreview key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>

        {showPicker && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
            <div className="w-full max-w-4xl shadow-2xl rounded-2xl bg-white dark:bg-neutral-900 my-auto">
              <MediaPicker
                onSelect={(items) => setSelectedItems(items)}
                onClose={() => setShowPicker(false)}
                maxSelection={3}
                initialSelectionIds={selectedItems.map((item) => item.id)}
                title="Select product media assets"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
