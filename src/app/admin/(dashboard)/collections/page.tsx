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
  Pencil,
  PlusCircle,
  HelpCircle,
  Eye
} from "lucide-react";

interface Rule {
  id?: string;
  column: string;
  relation: string;
  value: string;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "manual" | "dynamic";
  isActive: boolean;
  showOnHomepage: boolean;
  showInDropdown: boolean;
  sortOrder: number;
  createdAt: string;
  rules?: Rule[];
  products?: { productId: string }[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  priceMin: number;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

export default function AdminCollectionsPage() {
  const [collectionsList, setCollectionsList] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Loaders
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal forms state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"manual" | "dynamic">("manual");
  const [isActive, setIsActive] = useState(true);
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [showInDropdown, setShowInDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [colRes, prodRes, catRes, brandRes] = await Promise.all([
        fetch("/api/admin/collections"),
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/brands")
      ]);

      if (colRes.ok) setCollectionsList(await colRes.json());
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        // Extract products list from search response style if needed
        setProducts(prodData.products || prodData || []);
      }
      if (catRes.ok) setCategories(await catRes.json());
      if (brandRes.ok) setBrands(await brandRes.json());
    } catch (error) {
      console.error("Error loading admin collections data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartCreate = () => {
    setEditingCollection(null);
    setName("");
    setSlug("");
    setDescription("");
    setType("manual");
    setIsActive(true);
    setShowOnHomepage(false);
    setShowInDropdown(false);
    setSortOrder(0);
    setSelectedProductIds([]);
    setRules([]);
    setIsModalOpen(true);
  };

  const handleStartEdit = (col: Collection) => {
    setEditingCollection(col);
    setName(col.name);
    setSlug(col.slug);
    setDescription(col.description || "");
    setType(col.type);
    setIsActive(col.isActive);
    setShowOnHomepage(col.showOnHomepage);
    setShowInDropdown(col.showInDropdown || false);
    setSortOrder(col.sortOrder);
    setSelectedProductIds((col.products || []).map(p => p.productId));
    setRules(col.rules || []);
    setIsModalOpen(true);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const url = editingCollection 
        ? `/api/admin/collections/${editingCollection.id}`
        : "/api/admin/collections";
      const method = editingCollection ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || null,
          type,
          isActive,
          showOnHomepage,
          showInDropdown,
          sortOrder: Number(sortOrder),
          productIds: type === "manual" ? selectedProductIds : [],
          rules: type === "dynamic" ? rules.map(({ column, relation, value }) => ({ column, relation, value })) : [],
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        await loadData();
      } else {
        const data = await res.json();
        alert(`Failed to save collection: ${data.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error saving collection:", error);
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCollection = async (id: string, colName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the collection "${colName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/collections/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        alert(`Failed to delete collection: ${data.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error deleting collection:", error);
    }
  };

  // Rule Builders actions
  const addRule = () => {
    setRules([...rules, { column: "name", relation: "contains", value: "" }]);
  };

  const removeRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const updateRule = (idx: number, field: keyof Rule, val: string) => {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: val };
    
    // Auto-update relation logic if column type changes to price or IDs
    if (field === "column") {
      if (val === "price") {
        updated[idx].relation = "less_than_or_equal";
      } else if (val === "categoryId" || val === "brandId") {
        updated[idx].relation = "equals";
      } else {
        updated[idx].relation = "contains";
      }
      updated[idx].value = "";
    }
    setRules(updated);
  };

  const toggleProductSelect = (pId: string) => {
    if (selectedProductIds.includes(pId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== pId));
    } else {
      setSelectedProductIds([...selectedProductIds, pId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">Product Collections</h1>
          <p className="text-xs text-muted-foreground font-light">
            Group products into collections manually or write dynamic logic matching attribute tags and pricing boundaries.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm shadow-primary/5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Collection
          </button>
        </div>
      </div>

      {/* Collections Table / List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs font-light">Retrieving collections mapping list...</p>
          </div>
        ) : collectionsList.length === 0 ? (
          <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <FolderHeart className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h3 className="text-sm font-semibold tracking-wide">No Collections Created</h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Group catalog designs. Create manual or dynamic collections to display in storefront grids.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collectionsList.map((col) => (
              <div 
                key={col.id} 
                className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm hover:border-primary/20 transition-all flex flex-col justify-between gap-4 group relative"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-serif text-lg font-normal text-foreground leading-tight">{col.name}</h4>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-border bg-secondary/15 text-secondary">
                          {col.type}
                        </span>
                        {!col.isActive && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-500">
                            Inactive
                          </span>
                        )}
                        {col.showOnHomepage && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                            Home Grid (Order: {col.sortOrder})
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">slug: {col.slug}</p>
                    </div>
                  </div>

                  {col.description && (
                    <p className="text-xs text-muted-foreground font-light leading-relaxed line-clamp-2">
                      {col.description}
                    </p>
                  )}

                  {/* Rules or product counts preview */}
                  <div className="p-3.5 bg-secondary/10 border border-border/20 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>{col.type === "dynamic" ? "Compilation Rules" : "Manual Selection"}</span>
                      <span>{col.products?.length || 0} Products</span>
                    </div>

                    {col.type === "dynamic" ? (
                      <div className="space-y-1 mt-1">
                        {col.rules && col.rules.length > 0 ? (
                          col.rules.map((r, i) => (
                            <div key={i} className="text-[10px] text-foreground font-mono flex gap-1.5 items-center bg-card/40 px-2 py-1 rounded border border-border/10">
                              <span className="text-primary font-semibold">{r.column}</span>
                              <span className="text-muted-foreground">{r.relation}</span>
                              <span className="text-secondary font-medium">"{r.value}"</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-rose-500 font-light italic">No compile rules configured.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-light italic mt-1">
                        Selected designs are bound manually to this feed.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/20 mt-2">
                  <span className="text-[9px] text-muted-foreground font-mono">
                    Created: {new Date(col.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(col)}
                      className="p-2.5 bg-primary/10 hover:bg-primary/25 border border-primary/20 text-primary rounded-xl transition-all cursor-pointer"
                      title="Edit Collection"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(col.id, col.name)}
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-500 rounded-xl transition-all cursor-pointer"
                      title="Delete Collection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collection Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm transition-opacity p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/40 shrink-0">
              <h3 className="font-serif text-lg font-normal text-foreground">
                {editingCollection ? "Edit Product Collection" : "Create Product Collection"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveCollection} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-6 space-y-5 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Collection Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bridal Selection"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">URL Slug (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. bridal-selection"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short summary for this collection..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 bg-secondary/10 p-4.5 rounded-2xl border border-border/30">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground">Status & Settings</h4>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                      />
                      <span className="text-xs text-foreground">Collection Active</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={showInDropdown}
                        onChange={(e) => setShowInDropdown(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                      />
                      <span className="text-xs text-foreground">Show in Shop Dropdown</span>
                    </label>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground">Homepage Settings</h4>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={showOnHomepage}
                        onChange={(e) => setShowOnHomepage(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                      />
                      <span className="text-xs text-foreground">Show on Homepage</span>
                    </label>

                    {(showOnHomepage || showInDropdown) && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sort Order</label>
                        <input
                          type="number"
                          min={0}
                          value={sortOrder}
                          onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3.5 py-2 bg-card border border-border focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Collection Type Selector */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Collection Membership Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label 
                      className={`flex flex-col p-4 border rounded-2xl cursor-pointer hover:border-primary/40 transition-all ${
                        type === "manual" ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="type" 
                        value="manual" 
                        checked={type === "manual"}
                        onChange={() => setType("manual")}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold text-foreground">Manual Assignment</span>
                      <span className="text-[10px] text-muted-foreground mt-1 leading-normal font-light">
                        Select specific products to hand-curate inside this collection list.
                      </span>
                    </label>

                    <label 
                      className={`flex flex-col p-4 border rounded-2xl cursor-pointer hover:border-primary/40 transition-all ${
                        type === "dynamic" ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="type" 
                        value="dynamic" 
                        checked={type === "dynamic"}
                        onChange={() => setType("dynamic")}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold text-foreground">Dynamic Rule-Builder</span>
                      <span className="text-[10px] text-muted-foreground mt-1 leading-normal font-light">
                        Write database conditional rules to automatically compile matching products.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Conditional Sub-panels depending on type */}
                {type === "manual" ? (
                  <div className="space-y-3 pt-3 border-t border-border/20">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Products ({selectedProductIds.length} Selected)</label>
                    </div>

                    <div className="border border-border/60 rounded-2xl divide-y divide-border/30 max-h-56 overflow-y-auto bg-secondary/5">
                      {products.map((p) => {
                        const isSelected = selectedProductIds.includes(p.id);
                        return (
                          <div 
                            key={p.id}
                            onClick={() => toggleProductSelect(p.id)}
                            className="flex items-center justify-between p-3.5 hover:bg-secondary/15 cursor-pointer transition-colors"
                          >
                            <span className="text-xs text-foreground font-medium">{p.name}</span>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border bg-card"
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-3 border-t border-border/20">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dynamic Compiling Rules</label>
                      <button
                        type="button"
                        onClick={addRule}
                        className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-primary hover:underline cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add Rule
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {rules.length === 0 ? (
                        <div className="py-6 border border-dashed border-border/60 rounded-2xl text-center text-xs text-muted-foreground font-light italic">
                          No rules defined yet. Add a rule to matches products.
                        </div>
                      ) : (
                        rules.map((rule, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-secondary/10 p-3 rounded-2xl border border-border/35">
                            <select
                              value={rule.column}
                              onChange={(e) => updateRule(idx, "column", e.target.value)}
                              className="px-2.5 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none"
                            >
                              <option value="name">Product Name</option>
                              <option value="price">Min Price (Paise)</option>
                              <option value="categoryId">Category ID</option>
                              <option value="brandId">Brand ID</option>
                              <option value="shape">Nail Shape</option>
                              <option value="length">Nail Length</option>
                              <option value="colour">Nail Color</option>
                              <option value="texture">Nail Texture</option>
                            </select>

                            <select
                              value={rule.relation}
                              onChange={(e) => updateRule(idx, "relation", e.target.value)}
                              className="px-2.5 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none"
                            >
                              {rule.column === "price" ? (
                                <>
                                  <option value="equals">Equals</option>
                                  <option value="greater_than_or_equal">Greater Than / Equal</option>
                                  <option value="less_than_or_equal">Less Than / Equal</option>
                                </>
                              ) : rule.column === "categoryId" || rule.column === "brandId" ? (
                                <>
                                  <option value="equals">Equals</option>
                                  <option value="not_equals">Not Equals</option>
                                </>
                              ) : (
                                <>
                                  <option value="equals">Equals</option>
                                  <option value="contains">Contains</option>
                                  <option value="not_equals">Not Equals</option>
                                </>
                              )}
                            </select>

                            {rule.column === "categoryId" ? (
                              <select
                                value={rule.value}
                                onChange={(e) => updateRule(idx, "value", e.target.value)}
                                className="flex-1 px-2.5 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none"
                              >
                                <option value="">Select Category...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            ) : rule.column === "brandId" ? (
                              <select
                                value={rule.value}
                                onChange={(e) => updateRule(idx, "value", e.target.value)}
                                className="flex-1 px-2.5 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground focus:outline-none"
                              >
                                <option value="">Select Brand...</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Value..."
                                required
                                value={rule.value}
                                onChange={(e) => updateRule(idx, "value", e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-card border border-border focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                              />
                            )}

                            <button
                              type="button"
                              onClick={() => removeRule(idx)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-6 border-t border-border/40 bg-secondary/10 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
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
                  ) : editingCollection ? (
                    "Save Changes"
                  ) : (
                    "Create Collection"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
