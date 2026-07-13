"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderHeart, 
  Plus, 
  Trash2, 
  Loader2, 
  Folder, 
  X, 
  Check, 
  AlertCircle,
  Pencil
} from "lucide-react";
import MediaPicker from "@/components/media/media-picker";

interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  showOnHomepage: boolean;
  showInDropdown: boolean;
  sortOrder: number;
  createdAt: string;
  children?: Category[];
}

export default function AdminCategoriesPage() {
  // Data lists
  const [categoriesFlat, setCategoriesFlat] = useState<Category[]>([]);
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  
  // Loaders
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Overlay / Modal forms state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catParentId, setCatParentId] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catImage, setCatImage] = useState("");
  const [catShowOnHomepage, setCatShowOnHomepage] = useState(false);
  const [catShowInDropdown, setCatShowInDropdown] = useState(false);
  const [catSortOrder, setCatSortOrder] = useState(0);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Media Picker states
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const handleMediaSelect = (selected: any[]) => {
    if (selected.length > 0) {
      setCatImage(selected[0].url);
    }
    setShowMediaPicker(false);
  };

  // Load Categories Flat and Tree
  const loadCategories = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Category Start Edit
  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatParentId(cat.parentId || "");
    setCatDescription(cat.description || "");
    setCatImage(cat.image || "");
    setCatShowOnHomepage(cat.showOnHomepage || false);
    setCatShowInDropdown(cat.showInDropdown || false);
    setCatSortOrder(cat.sortOrder || 0);
    setIsModalOpen(true);
  };

  // Category Submit (Create or Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setIsSubmitting(true);
    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          slug: catSlug.trim() || undefined,
          parentId: catParentId || null,
          description: catDescription.trim() || null,
          image: catImage.trim() || null,
          showOnHomepage: catShowOnHomepage,
          showInDropdown: catShowInDropdown,
          sortOrder: Number(catSortOrder),
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingCategory(null);
        // Reset form
        setCatName("");
        setCatSlug("");
        setCatParentId("");
        setCatDescription("");
        setCatImage("");
        setCatShowOnHomepage(false);
        setCatShowInDropdown(false);
        setCatSortOrder(0);
        // Reload list
        await loadCategories();
      } else {
        const data = await res.json();
        alert(`Failed to save category: ${data.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error saving category:", error);
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

  // Tree Renderer Helper
  const renderCategoryNode = (cat: Category, depth = 0) => {
    return (
      <div key={cat.id} className="space-y-1.5">
        <div 
          className="flex items-center justify-between p-3.5 bg-card hover:bg-secondary/10 border border-border/40 hover:border-primary/20 rounded-2xl transition-all shadow-sm"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${depth === 0 ? "bg-primary/10 text-primary" : "bg-secondary/15 text-secondary border border-secondary/20"}`}>
              <Folder className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                <span className="text-[8px] font-mono bg-secondary/10 text-secondary px-1.5 py-0.5 border border-secondary/20 rounded font-medium">
                  slug: {cat.slug}
                </span>
                {cat.showOnHomepage && (
                  <span className="text-[8px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    On Homepage (Order: {cat.sortOrder})
                  </span>
                )}
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
              onClick={() => handleStartEditCategory(cat)}
              className="p-2 bg-primary/10 hover:bg-primary/25 border border-primary/20 text-primary rounded-xl transition-all cursor-pointer"
              title="Edit Category"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
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
          <h1 className="font-serif text-2xl font-normal text-foreground">Categories Taxonomy</h1>
          <p className="text-xs text-muted-foreground font-light">
            Organize catalog structures by category sub-nodes, nesting children hierarchies and controlling homepage display settings.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          <button
            onClick={() => {
              setEditingCategory(null);
              setCatName("");
              setCatSlug("");
              setCatParentId("");
              setCatDescription("");
              setCatImage("");
              setCatShowOnHomepage(false);
              setCatSortOrder(0);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm shadow-primary/5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Categories View */}
      <div className="space-y-4">
        {isLoading ? (
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

      {/* Category Creation Overlay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm transition-opacity p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="font-serif text-lg font-normal text-foreground">
                {editingCategory ? "Edit Category" : "Create New Category"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCategory(null);
                  setCatName("");
                  setCatSlug("");
                  setCatParentId("");
                  setCatDescription("");
                  setCatImage("");
                  setCatShowOnHomepage(false);
                  setCatSortOrder(0);
                }}
                className="p-1.5 rounded-full hover:bg-secondary/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCategory}>
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
                    {categoriesFlat
                      .filter((c) => !editingCategory || c.id !== editingCategory.id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({cat.slug})
                        </option>
                      ))}
                  </select>
                </div>

                 <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.cloudinary.com/..."
                      value={catImage}
                      onChange={(e) => setCatImage(e.target.value)}
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
                    rows={2}
                    placeholder="Category overview explanation..."
                    value={catDescription}
                    onChange={(e) => setCatDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground resize-none"
                  />
                </div>

                <div className="p-4 bg-secondary/15 rounded-2xl border border-border/30 space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground">Display Settings</h4>
                  
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={catShowOnHomepage}
                      onChange={(e) => setCatShowOnHomepage(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">Show in Homepage Grid</p>
                      <p className="text-[10px] text-muted-foreground">Display this category as a card in the homepage featured row.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={catShowInDropdown}
                      onChange={(e) => setCatShowInDropdown(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                    />
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-foreground">Show in Shop Dropdown</p>
                      <p className="text-[10px] text-muted-foreground">Display this category as a link in the Shop navigation dropdown.</p>
                    </div>
                  </label>

                  {(catShowOnHomepage || catShowInDropdown) && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort Order</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="e.g. 0 (lowest order shows first)"
                        value={catSortOrder}
                        onChange={(e) => setCatSortOrder(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-3.5 py-2 bg-card border border-border focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-6 border-t border-border/40 bg-secondary/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCategory(null);
                    setCatName("");
                    setCatSlug("");
                    setCatParentId("");
                    setCatDescription("");
                    setCatImage("");
                    setCatShowOnHomepage(false);
                    setCatShowInDropdown(false);
                    setCatSortOrder(0);
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
                  ) : editingCategory ? (
                    "Save Changes"
                  ) : (
                    "Save Category"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-60 bg-foreground/20 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-card border border-border/40 rounded-3xl w-full max-w-4xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto relative my-auto">
            <MediaPicker
              onSelect={handleMediaSelect}
              onClose={() => setShowMediaPicker(false)}
              maxSelection={1}
              title="Select Category Image"
            />
          </div>
        </div>
      )}
    </div>
  );
}
