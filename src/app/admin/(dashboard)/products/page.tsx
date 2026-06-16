"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Layers, 
  Trash2, 
  Loader2, 
  Sparkles, 
  ChevronRight, 
  Tag, 
  Check, 
  X, 
  AlertCircle 
} from "lucide-react";
import Link from "next/link";

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Variant {
  id: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
}

interface ProductMedia {
  isFeatured: boolean;
  media: {
    url: string;
  };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  priceMin: number;
  priceMax: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isActive: boolean;
  createdAt: string;
  brand: Brand | null;
  category: Category | null;
  variants: Variant[];
  media: ProductMedia[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Loading and action states
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Fetch all products, categories, and brands
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [productsRes, catsRes, brandsRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
          fetch("/api/brands")
        ]);

        if (productsRes.ok) setProducts(await productsRes.json());
        if (catsRes.ok) setCategories(await catsRes.json());
        if (brandsRes.ok) setBrands(await brandsRes.json());
      } catch (error) {
        console.error("Error loading admin products:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle Product Deletion
  const handleDeleteProduct = async (productId: string, productName: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete "${productName}"? This will delete all its variants, image mappings, and transaction associations.`);
    if (!confirmed) return;

    setIsDeletingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        alert("Failed to delete product.");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("An error occurred while deleting the product.");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Format price helper
  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  // Filter and Sort Logic
  const filteredProducts = products.filter(product => {
    // 1. Search filter
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.variants.some(v => v.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Category filter
    const matchesCategory = 
      selectedCategory === "all" || 
      product.category?.id === selectedCategory;

    // 3. Brand filter
    const matchesBrand = 
      selectedBrand === "all" || 
      product.brand?.id === selectedBrand;

    // 4. Status filter
    const matchesStatus = 
      selectedStatus === "all" ||
      (selectedStatus === "active" && product.isActive) ||
      (selectedStatus === "inactive" && !product.isActive);

    return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === "name_asc") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "name_desc") {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === "price_asc") {
      return a.priceMin - b.priceMin;
    }
    if (sortBy === "price_desc") {
      return b.priceMax - a.priceMax;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Products Catalog</h1>
          <p className="text-xs text-muted-foreground font-light">
            Manage your press-on nail designs, pricing, variants, and catalog filters.
          </p>
        </div>
        <div>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Search and Filters panel */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-card border border-border/40 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search products by Name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-border rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/35 font-medium transition-all"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2 bg-card border border-border text-foreground rounded-xl text-xs font-semibold outline-none focus:border-primary cursor-pointer hover:bg-secondary/40 transition-colors"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Brand Filter */}
        <div>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-3.5 py-2 bg-card border border-border text-foreground rounded-xl text-xs font-semibold outline-none focus:border-primary cursor-pointer hover:bg-secondary/40 transition-colors"
          >
            <option value="all">All Brands</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Sort select */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3.5 py-2 bg-card border border-border text-foreground rounded-xl text-xs font-semibold outline-none focus:border-primary cursor-pointer hover:bg-secondary/40 transition-colors"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="price_asc">Price (Low to High)</option>
            <option value="price_desc">Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-card border border-border/40 rounded-3xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-24 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-xs text-muted-foreground font-light">Loading products catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-24 text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <Layers className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-semibold tracking-wide">No products found</h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                {products.length === 0 
                  ? "Your catalog database is empty. Create your first nail design."
                  : "We couldn't find any products matching your search query or filter selections."}
              </p>
            </div>
            {products.length === 0 && (
              <div className="pt-2">
                <Link
                  href="/admin/products/new"
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary text-foreground hover:bg-muted border border-border rounded-xl text-xs font-medium transition-all cursor-pointer"
                >
                  Create Product
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light border-collapse">
              <thead>
                <tr className="bg-secondary/35 border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                  <th className="py-3.5 px-4 min-w-[250px]">Design Details</th>
                  <th className="py-3.5 px-4 w-40">Brand / Category</th>
                  <th className="py-3.5 px-4 text-center w-36">Price Range</th>
                  <th className="py-3.5 px-4 text-center w-24">Variants</th>
                  <th className="py-3.5 px-4 text-center w-40">Marketing Badges</th>
                  <th className="py-3.5 px-4 text-center w-24">Status</th>
                  <th className="py-3.5 px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  // Find featured media URL
                  const featuredMedia = product.media.find(m => m.isFeatured) || product.media[0];
                  const imageUrl = featuredMedia?.media?.url;
                  
                  return (
                    <tr 
                      key={product.id} 
                      className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all group"
                    >
                      {/* Product details (Image + Name) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary/50 border border-border/60 overflow-hidden shrink-0 flex items-center justify-center">
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={product.name} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <Layers className="w-4 h-4 text-muted-foreground/45" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground text-xs leading-normal block">
                              {product.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono font-light block">
                              slug: {product.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Brand and Category */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="text-foreground text-[11px] font-medium block">
                            {product.brand?.name || <span className="text-muted-foreground/30 italic">No Brand</span>}
                          </span>
                          <span className="text-muted-foreground text-[10px] block">
                            {product.category?.name || <span className="text-muted-foreground/30 italic">No Category</span>}
                          </span>
                        </div>
                      </td>

                      {/* Price Range */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-semibold text-xs text-foreground block">
                          {product.priceMin === product.priceMax 
                            ? formatPrice(product.priceMin)
                            : `${formatPrice(product.priceMin)} - ${formatPrice(product.priceMax)}`}
                        </span>
                      </td>

                      {/* Variants Count */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          {product.variants.length}
                        </span>
                      </td>

                      {/* Marketing Badges */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-wrap gap-1 justify-center">
                          {product.isFeatured && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              <Sparkles className="w-2.5 h-2.5" />
                              Featured
                            </span>
                          )}
                          {product.isBestSeller && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Seller
                            </span>
                          )}
                          {!product.isFeatured && !product.isBestSeller && (
                            <span className="text-muted-foreground/30 italic text-[10px] font-light">None</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${
                          product.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}>
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isDeletingId === product.id}
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          className="inline-flex items-center justify-center p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 border border-border/40 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                          title="Delete Product"
                        >
                          {isDeletingId === product.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
