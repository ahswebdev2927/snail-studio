import React from "react";
import { Layers, Plus, Search } from "lucide-react";
import Link from "next/link";

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Products Catalog</h1>
          <p className="text-xs text-muted-foreground font-light">
            Manage your press-on nail designs, pricing, assets, and SKU attributes.
          </p>
        </div>
        <div>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-primary/10 text-primary rounded-full">
          <Layers className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-sm font-semibold tracking-wide">No products initialized</h3>
          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Create your first nail design, customize sizes, choose shapes, and let the system generate variants.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary text-foreground hover:bg-muted border border-border rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            Create Product
          </Link>
        </div>
      </div>
    </div>
  );
}
