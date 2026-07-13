"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Tag, 
  X, 
  Image as ImageIcon,
  Pencil
} from "lucide-react";
import MediaPicker from "@/components/media/media-picker";

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
}

export default function AdminBrandsPage() {
  // Data lists
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Loaders
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Overlay / Modal forms state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Brand Form State
  const [brdName, setBrdName] = useState("");
  const [brdSlug, setBrdSlug] = useState("");
  const [brdDescription, setBrdDescription] = useState("");
  const [brdLogoUrl, setBrdLogoUrl] = useState("");
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Media Picker states
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const handleMediaSelect = (selected: any[]) => {
    if (selected.length > 0) {
      setBrdLogoUrl(selected[0].url);
    }
    setShowMediaPicker(false);
  };

  // Load Brands
  const loadBrands = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/brands");
      if (res.ok) {
        setBrands(await res.json());
      }
    } catch (error) {
      console.error("Error loading brands:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  // Brand Start Edit
  const handleStartEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setBrdName(brand.name);
    setBrdSlug(brand.slug);
    setBrdDescription(brand.description || "");
    setBrdLogoUrl(brand.logoUrl || "");
    setIsModalOpen(true);
  };

  // Brand Submit (Create or Update)
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brdName.trim()) return;

    setIsSubmitting(true);
    try {
      const url = editingBrand 
        ? `/api/brands/${editingBrand.id}`
        : "/api/brands";
      const method = editingBrand ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brdName.trim(),
          slug: brdSlug.trim() || undefined,
          description: brdDescription.trim() || null,
          logoUrl: brdLogoUrl.trim() || null,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingBrand(null);
        // Reset form
        setBrdName("");
        setBrdSlug("");
        setBrdDescription("");
        setBrdLogoUrl("");
        // Reload list
        await loadBrands();
      } else {
        const data = await res.json();
        alert(`Failed to save brand: ${data.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error saving brand:", error);
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Brand
  const handleDeleteBrand = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the brand "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/brands/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadBrands();
      } else {
        const data = await res.json();
        alert(`Failed to delete brand: ${data.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error deleting brand:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">Brands Registry</h1>
          <p className="text-xs text-muted-foreground font-light">
            Register custom designer names, private labels, and brand attributes to group and showcase items in storefront collections.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          <button
            onClick={() => {
              setEditingBrand(null);
              setBrdName("");
              setBrdSlug("");
              setBrdDescription("");
              setBrdLogoUrl("");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm shadow-primary/5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Brand
          </button>
        </div>
      </div>

      {/* Brands View */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs font-light">Retrieving brand list...</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <Tag className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h3 className="text-sm font-semibold tracking-wide">No Brands Added</h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Register designer names or private labels to sort client product listings.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((brd) => (
              <div 
                key={brd.id} 
                className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm hover:border-primary/20 transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate max-w-[150px]">{brd.name}</h4>
                      <span className="text-[8px] font-mono bg-secondary/10 text-secondary px-1.5 py-0.5 border border-secondary/20 rounded font-medium">
                        {brd.slug}
                      </span>
                    </div>
                    {brd.description && (
                      <p className="text-[10px] text-muted-foreground font-light leading-relaxed line-clamp-3">
                        {brd.description}
                      </p>
                    )}
                  </div>

                  {brd.logoUrl ? (
                    <img 
                      src={brd.logoUrl} 
                      alt={brd.name} 
                      className="w-12 h-12 rounded-xl object-contain border border-border bg-card p-1 shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center text-muted-foreground shrink-0">
                      <ImageIcon className="w-5 h-5 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/20 mt-1">
                  <span className="text-[9px] text-muted-foreground font-mono">
                    Registered: {new Date(brd.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEditBrand(brd)}
                      className="p-2 bg-primary/10 hover:bg-primary/25 border border-primary/20 text-primary rounded-xl transition-all cursor-pointer"
                      title="Edit Brand"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBrand(brd.id, brd.name)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-500 rounded-xl transition-all cursor-pointer"
                      title="Delete Brand"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Brand Creation Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm transition-opacity p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="font-serif text-lg font-normal text-foreground">
                {editingBrand ? "Edit Brand Details" : "Register New Brand"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingBrand(null);
                  setBrdName("");
                  setBrdSlug("");
                  setBrdDescription("");
                  setBrdLogoUrl("");
                }}
                className="p-1.5 rounded-full hover:bg-secondary/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBrand}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Snail Signature"
                    value={brdName}
                    onChange={(e) => setBrdName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">URL Slug (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. snail-signature (auto-slugified if blank)"
                    value={brdSlug}
                    onChange={(e) => setBrdSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>

                 <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Logo URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.cloudinary.com/..."
                      value={brdLogoUrl}
                      onChange={(e) => setBrdLogoUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="px-4 py-2.5 bg-transparent hover:bg-secondary/15 text-foreground border border-border rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                    >
                      Select Media
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brand details or label bio..."
                    value={brdDescription}
                    onChange={(e) => setBrdDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-6 border-t border-border/40 bg-secondary/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingBrand(null);
                    setBrdName("");
                    setBrdSlug("");
                    setBrdDescription("");
                    setBrdLogoUrl("");
                  }}
                  className="px-4 py-2 bg-transparent hover:bg-secondary/15 text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : editingBrand ? (
                    "Save Changes"
                  ) : (
                    "Save Brand"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-60 bg-foreground/20 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="w-full max-w-4xl relative my-auto">
            <MediaPicker
              onSelect={handleMediaSelect}
              onClose={() => setShowMediaPicker(false)}
              maxSelection={1}
              title="Select Brand Logo"
            />
          </div>
        </div>
      )}
    </div>
  );
}
