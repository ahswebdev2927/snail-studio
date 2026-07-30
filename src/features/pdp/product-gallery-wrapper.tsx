"use client";

import React from "react";
import dynamic from "next/dynamic";
import { GalleryMediaItem } from "./product-gallery";

const ProductGallery = dynamic(
  () => import("./product-gallery").then(mod => mod.ProductGallery),
  {
    loading: () => (
      <div className="aspect-square w-full rounded-2xl bg-secondary/30 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

interface ProductGalleryWrapperProps {
  media: GalleryMediaItem[];
  productName: string;
}

export function ProductGalleryWrapper({ media, productName }: ProductGalleryWrapperProps) {
  return <ProductGallery media={media} productName={productName} />;
}
