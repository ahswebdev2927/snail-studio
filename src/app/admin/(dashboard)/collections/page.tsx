"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderHeart, 
  Plus, 
  Trash2, 
  Loader2, 
  Folder, 
  Tag, 
  X, 
  ChevronRight, 
  Image as ImageIcon, 
  Compass, 
  Check, 
  AlertCircle
} from "lucide-react";

interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  createdAt: string;
  children?: Category[];
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
}

export default function AdminCollectionsPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "brands">("categories");
  
  // Data lists
  const [categoriesFlat, setCategoriesFlat] = useState<Category[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Loaders
  const [isCatLoading, setIsCatLoading] = useState(true);
  const [isBrdLoading, setIsBrdLoading] = useState(true);

  // Overlay / Modal forms state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isBrdModalOpen, setIsBrdModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catParentId, setCatParentId] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catImage, setCatImage] = useState("");

  // Brand Form State
  const [brdName, setBrdName] = useState("");
  const [brdSlug, setBrdSlug] = useState("");
  const [brdDescription, setBrdDescription] = useState("");
  const [brdLogoUrl, setBrdLogoUrl] = useState("");

  // Load Categories Flat and Tree
  const loadCategories = async () => {
    setIsCatLoading(true);
    try {
      const [flatRes, treeRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/categories?tree=true")
      ]);
      
      if (flatRes.ok) setCategoriesFlat(await flatRes.json());
      if (treeRes.ok) setCategoriesTree(await treeRes.json());
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setIsCatLoading(false);
    }
  };

  // Load Brands
  const loadBrands = async () => {
    setIsBrdLoading(true);
    try {
      const res = await fetch("/api/brands");
      if (res.ok) {
        setBrands(await res.json());
      }
    } catch (error) {
      console.error("Error loading brands:", error);
    } finally {
      setIsBrdLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadBrands();
  }, []);

  // Category Submit
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          slug: catSlug.trim() || undefined,
          parentId: catParentId || null,
          description: catDescription.trim() || null,
          image: catImage.trim() || null,
        }),
      });

      if (res.ok) {
        setIsCatModalOpen(false);
        // Reset form
        setCatName("");
        setCatSlug("");
        setCatParentId("");
        setCatDescription("");
        setCatImage("");
        // Reload list
        await loadCategories();
      } else {
        const data = await res.json();
        alert(`Failed to create category: ${data.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error creating category:", error);
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Brand Submit
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brdName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brdName.trim(),
          slug: brdSlug.trim() || undefined,
          description: brdDescription.trim() || null,
          logoUrl: brdLogoUrl.trim() || null,
        }),
      });

      if (res.ok) {
        setIsBrdModalOpen(false);
        // Reset form
        setBrdName("");
        setBrdSlug("");
        setBrdDescription("");
        setBrdLogoUrl("");
        // Reload list
        await loadBrands();
      } else {
        const data = await res.json();
        alert(`Failed to create brand: ${data.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error creating brand:", error);
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the category "${name}"? Product links will remain but their category will be unassigned.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadCategories();
      } else {
        const data = await res.json();
        alert(`Failed to delete category: ${data.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error deleting category:", error);
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

  // Tree Renderer Helper
  const renderCategoryNode = (cat: Category, depth = 0) => {
    return (
      <div key={cat.id} className="space-y-1.5">
        <div 
          className="flex items-center justify-between p-3.5 bg-card hover:bg-secondary/10 border border-border/40 hover:border-primary/20 rounded-2xl transition-all shadow-sm"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${depth === 0 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
              <Folder className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                <span className="text-[8px] font-mono bg-secondary px-1.5 py-0.5 border border-border rounded text-muted-foreground">
                  slug: {cat.slug}
                </span>
              </div>
              {cat.description && (
                <p className="text-[10px] text-muted-foreground font-light max-w-md truncate">
                  {cat.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {cat.image && (
              <img 
                src={cat.image} 
                alt={cat.name} 
                className="w-8 h-8 rounded-lg object-cover border border-border" 
              />
            )}
            <button
              onClick={() => handleDeleteCategory(cat.id, cat.name)}
              className="p-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-500 rounded-xl transition-all cursor-pointer"
              title="Delete Category"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {cat.children && cat.children.length > 0 && (
          <div className="space-y-1.5 border-l border-border/20 ml-[21px] pl-[15px] pt-1">
            {cat.children.map(child => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">Taxonomy Compiler</h1>
          <p className="text-xs text-muted-foreground font-light">
            Organize catalog structures by category sub-nodes, nesting children hierarchies and brand metadata labels.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          {activeTab === "categories" ? (
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm shadow-primary/5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          ) : (
            <button
              onClick={() => setIsBrdModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm shadow-primary/5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Brand
            </button>
          )}
        </div>
      </div>

      {/* Tabs selectors */}
      <div className="flex gap-1.5 bg-card border border-border/30 rounded-2xl p-4 shadow-sm">
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4.5 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "categories"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/5"
              : "bg-secondary/40 hover:bg-secondary/70 text-muted-foreground border border-border/35"
          }`}
        >
          <Folder className="w-4 h-4" />
          Categories list
        </button>
        <button
          onClick={() => setActiveTab("brands")}
          className={`px-4.5 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "brands"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/5"
              : "bg-secondary/40 hover:bg-secondary/70 text-muted-foreground border border-border/35"
          }`}
        >
          <Tag className="w-4 h-4" />
          Brands compiler
        </button>
      </div>

      {/* Categories View */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          {isCatLoading ? (
            <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs font-light">Retrieving taxonomy nodes tree...</p>
            </div>
          ) : categoriesTree.length === 0 ? (
            <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-primary/10 text-primary rounded-full">
                <FolderHeart className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-sm font-semibold tracking-wide">No Categories Created</h3>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  Start mapping catalog layout nodes. Add parent categories to compile product feeds.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {categoriesTree.map(cat => renderCategoryNode(cat))}
            </div>
          )}
        </div>
      )}

      {/* Brands View */}
      {activeTab === "brands" && (
        <div className="space-y-4">
          {isBrdLoading ? (
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
                        <span className="text-[8px] font-mono bg-secondary px-1.5 py-0.5 border border-border rounded text-muted-foreground">
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
                        className="w-12 h-12 rounded-xl object-contain border border-border bg-white p-1 shrink-0" 
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
                    <button
                      onClick={() => handleDeleteBrand(brd.id, brd.name)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-500 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Creation Overlay Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="font-serif text-lg font-normal text-foreground">Create New Category</h3>
              <button
                onClick={() => setIsCatModalOpen(false)}
                className="p-1.5 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateCategory}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Press-On Nails"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">URL Slug (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. press-on-nails (auto-slugified if blank)"
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Parent Node Category</label>
                  <select
                    value={catParentId}
                    onChange={(e) => setCatParentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-card border border-border focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  >
                    <option value="">No Parent (Root Node)</option>
                    {categoriesFlat.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.cloudinary.com/..."
                    value={catImage}
                    onChange={(e) => setCatImage(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Category overview explanation..."
                    value={catDescription}
                    onChange={(e) => setCatDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-6 border-t border-border/40 bg-secondary/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Creation Overlay Modal */}
      {isBrdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="font-serif text-lg font-normal text-foreground">Register New Brand</h3>
              <button
                onClick={() => setIsBrdModalOpen(false)}
                className="p-1.5 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBrand}>
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
                  <input
                    type="url"
                    placeholder="https://images.cloudinary.com/..."
                    value={brdLogoUrl}
                    onChange={(e) => setBrdLogoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
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
                  onClick={() => setIsBrdModalOpen(false)}
                  className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
