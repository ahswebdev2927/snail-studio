"use client";

import React from "react";
import dynamic from "next/dynamic";
import { GalleryMediaItem } from "./product-gallery";

const ProductGallery = dynamic(
  () => import("./product-gallery").then(mod => mod.ProductGallery),
  {
    loading: () => (
      <div className="aspect-square w-full rounded-2xl bg-secondary/15 animate-pulse" />
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
