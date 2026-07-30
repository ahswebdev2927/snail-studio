"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ProductForm = dynamic(
  () => import("@/features/admin/products/product-form"),
  {
    loading: () => (
      <div className="h-96 w-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-light font-mono">Loading product configuration...</p>
      </div>
    ),
    ssr: false,
  }
);

export default function NewProductPage() {
  return <ProductForm mode="create" />;
}
