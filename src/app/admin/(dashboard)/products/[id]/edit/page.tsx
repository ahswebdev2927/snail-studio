"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import ProductForm from "@/features/admin/products/product-form";

export default function EditProductPage() {
  const { id } = useParams() as { id: string };
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadProduct() {
      try {
        const res = await fetch(`/api/admin/products/${id}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load product details");
        }
        const data = await res.json();
        setProductData(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred while loading product details.");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-light font-mono">Loading product configuration...</p>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <div className="inline-flex p-4 bg-destructive/10 text-destructive rounded-full">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-wide">Error Loading Product</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            {error || "We couldn't retrieve this design configuration."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProductForm 
      mode="edit" 
      productId={id} 
      initialData={productData} 
    />
  );
}
