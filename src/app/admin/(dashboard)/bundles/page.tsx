"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Search,
  Trash2,
  Loader2,
  Check,
  X,
  AlertCircle,
  Percent,
  DollarSign,
  Edit2
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  priceMin: number;
}

interface BundleItem {
  bundleId: string;
  productId: string;
  product: Product;
}

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  items: BundleItem[];
}

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionId, setIsActionId] = useState<string | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Bundles and Products
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bundlesRes, productsRes] = await Promise.all([
        fetch("/api/bundles"),
        fetch("/api/products")
      ]);

      if (bundlesRes.ok) {
        setBundles(await bundlesRes.json());
      }
      if (productsRes.ok) {
        const prodData = await productsRes.json();
        setProducts(prodData.products || prodData);
      }
    } catch (error) {
      console.error("Error loading admin bundle data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatToDatetimeLocal = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const formatDateLabel = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedBundleId(null);
    setName("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue("");
    setSelectedProductIds([]);
    setStartDate("");
    setEndDate("");
    setIsActive(true);
    setFormError(null);
    setIsOpenModal(true);
  };

  const openEditModal = (bundle: Bundle) => {
    setModalMode("edit");
    setSelectedBundleId(bundle.id);
    setName(bundle.name);
    setDescription(bundle.description || "");
    setDiscountType(bundle.discountType);
    setDiscountValue(
      bundle.discountType === "fixed" ? bundle.discountValue / 100 : bundle.discountValue
    );
    setSelectedProductIds(bundle.items.map((i) => i.productId));
    setStartDate(bundle.startDate ? formatToDatetimeLocal(bundle.startDate) : "");
    setEndDate(bundle.endDate ? formatToDatetimeLocal(bundle.endDate) : "");
    setIsActive(bundle.isActive);
    setFormError(null);
    setIsOpenModal(true);
  };

  // Toggle Active Status
  const handleToggleStatus = async (bundleId: string, currentStatus: boolean) => {
    setIsActionId(bundleId);
    try {
      const res = await fetch(`/api/bundles/${bundleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (res.ok) {
        setBundles(prev =>
          prev.map(b => (b.id === bundleId ? { ...b, isActive: !currentStatus } : b))
        );
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    } finally {
      setIsActionId(null);
    }
  };

  // Delete Bundle
  const handleDeleteBundle = async (bundleId: string, bundleName: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete the bundle "${bundleName}"?`);
    if (!confirmed) return;

    setIsActionId(bundleId);
    try {
      const res = await fetch(`/api/bundles/${bundleId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setBundles(prev => prev.filter(b => b.id !== bundleId));
      } else {
        alert("Failed to delete bundle");
      }
    } catch (error) {
      console.error("Error deleting bundle:", error);
    } finally {
      setIsActionId(null);
    }
  };

  // Toggle Product Selection
  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Bundle name is required.");
      return;
    }
    if (discountValue === "" || Number(discountValue) <= 0) {
      setFormError("Discount value must be greater than zero.");
      return;
    }
    if (discountType === "percentage" && Number(discountValue) > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }
    if (selectedProductIds.length < 2) {
      setFormError("Please select at least 2 products for the bundle offer.");
      return;
    }

    setIsSaving(true);

    try {
      const finalValue = discountType === "fixed" ? Math.round(Number(discountValue) * 100) : Number(discountValue);

      const url = modalMode === "create" ? "/api/bundles" : `/api/bundles/${selectedBundleId}`;
      const method = modalMode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          discountType,
          discountValue: finalValue,
          startDate: startDate || null,
          endDate: endDate || null,
          isActive,
          productIds: selectedProductIds
        })
      });

      if (res.ok) {
        setIsOpenModal(false);
        fetchData();
      } else {
        const errData = await res.json();
        setFormError(errData.error || "Failed to save bundle.");
      }
    } catch (error: any) {
      setFormError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered Bundles List
  const filteredBundles = bundles.filter(b => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && b.isActive) ||
      (statusFilter === "inactive" && !b.isActive);

    return matchesSearch && matchesStatus;
  });

  const formatPrice = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0
    }).format(paise / 100);
  };

  return (
    <div className="space-y-8 p-6 font-sans text-foreground">
      {/* Header section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-serif font-light tracking-wide text-foreground flex items-center gap-3">
            <Layers className="w-8 h-8 text-primary" /> Product Bundles
          </h1>
          <p className="text-xs text-muted-foreground font-light">
            Manage multi-product discounts to increase your store's average order value.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Bundle Offer
        </button>
      </div>

      {/* Search & Filter section */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border/40 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bundles by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-xl text-xs bg-secondary/20 outline-hidden focus:border-primary/50 text-foreground transition-all font-light placeholder:text-muted-foreground/35"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 bg-card border border-border text-foreground rounded-xl text-xs font-semibold outline-hidden focus:border-primary cursor-pointer hover:bg-secondary/40 transition-colors"
          >
            <option value="all">All Bundles</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Main Content List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-light">Loading product bundles...</p>
        </div>
      ) : filteredBundles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border/40 rounded-3xl shadow-sm text-center p-6">
          <Layers className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-medium text-foreground">No Bundles Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm font-light">
            Create bundle offers to encourage clients to purchase matching sets and products together.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`bg-card border ${
                bundle.isActive ? "border-border/40" : "border-border/60 opacity-80"
              } rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group`}
            >
              <div>
                {/* Bundle Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-base leading-tight">
                      {bundle.name}
                    </h3>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide">
                      {bundle.discountType === "percentage" ? (
                        <>
                          <Percent className="w-3 h-3" /> {bundle.discountValue}% Off Bundle
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-3 h-3" /> Save {formatPrice(bundle.discountValue)}
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                      bundle.isActive ? "bg-emerald-500" : "bg-muted"
                    }`}
                  />
                </div>

                {/* Description */}
                {bundle.description && (
                  <p className="text-xs text-muted-foreground mt-3 font-light leading-relaxed line-clamp-2">
                    {bundle.description}
                  </p>
                )}

                {/* Schedule info if set */}
                {(bundle.startDate || bundle.endDate) && (
                  <div className="mt-3 text-[11px] space-y-0.5 text-muted-foreground font-light bg-secondary/15 p-2.5 rounded-xl border border-border/20">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">Scheduling</span>
                    {bundle.startDate && (
                      <div>
                        <span className="font-semibold text-foreground text-[10px]">Starts:</span> {formatDateLabel(bundle.startDate)}
                      </div>
                    )}
                    {bundle.endDate && (
                      <div>
                        <span className="font-semibold text-foreground text-[10px]">Ends:</span> {formatDateLabel(bundle.endDate)}
                      </div>
                    )}
                  </div>
                )}

                {/* Bundle items list */}
                <div className="mt-5 pt-4 border-t border-border/40 space-y-2">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block">Included Products ({bundle.items.length})</span>
                  <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1.5">
                    {bundle.items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between text-xs text-foreground bg-secondary/25 p-2.5 rounded-xl border border-border/20">
                        <span className="truncate font-light flex-1 pr-2">{item.product?.name || "Deleted Product"}</span>
                        {item.product && (
                          <span className="text-[11px] text-muted-foreground font-mono font-semibold">
                            {formatPrice(item.product.priceMin)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-border/20 flex items-center justify-between">
                <button
                  onClick={() => handleToggleStatus(bundle.id, bundle.isActive)}
                  disabled={isActionId === bundle.id}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    bundle.isActive
                      ? "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                      : "text-primary hover:bg-primary/10"
                  }`}
                >
                  {isActionId === bundle.id ? "Updating..." : bundle.isActive ? "Deactivate" : "Activate"}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(bundle)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all cursor-pointer"
                    title="Edit Bundle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBundle(bundle.id, bundle.name)}
                    disabled={isActionId === bundle.id}
                    className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                    title="Delete Bundle"
                  >
                    {isActionId === bundle.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center animate-fade-in">
          <div
            className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-xl overflow-hidden scale-in p-6 space-y-6 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-foreground">
                  {modalMode === "create" ? "Add New Bundle Offer" : "Edit Bundle Offer"}
                </h3>
                <p className="text-[10px] text-muted-foreground font-light">
                  Select combination of items and set a bundle-wide discount.
                </p>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-xs flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-light">{formError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Bundle Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bridal Glam & Fit Kit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-light transition-all placeholder:text-muted-foreground/35"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Introduce the discount to customers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-light transition-all placeholder:text-muted-foreground/35 min-h-[60px]"
                />
              </div>

              {/* Discount Rules */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-card border border-border text-foreground rounded-xl text-xs font-semibold outline-none focus:border-primary cursor-pointer hover:bg-secondary/40 transition-colors"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {discountType === "percentage" ? "Discount Percentage" : "Discount Value (INR)"}
                  </label>
                  <input
                    type="number"
                    placeholder={discountType === "percentage" ? "e.g. 15" : "e.g. 250"}
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    min="1"
                    max={discountType === "percentage" ? "100" : undefined}
                    className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-light transition-all placeholder:text-muted-foreground/35"
                    required
                  />
                </div>
              </div>

              {/* Product Checklist Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Select Products to Bundle
                  </label>
                  <span className="text-[10px] text-primary font-bold">
                    {selectedProductIds.length} Selected (min 2)
                  </span>
                </div>
                <div className="border border-border/40 rounded-2xl p-3 max-h-[180px] overflow-y-auto space-y-1.5 bg-secondary/10">
                  {products.map((product) => {
                    const isChecked = selectedProductIds.includes(product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleToggleProduct(product.id)}
                        className={`flex items-center justify-between text-xs px-3 py-2.5 border rounded-xl cursor-pointer transition-all ${
                          isChecked
                            ? "bg-accent/15 border-accent/40 text-foreground"
                            : "bg-card border-border text-muted-foreground hover:border-border/80"
                        }`}
                      >
                        <span className="font-light pr-2 truncate">{product.name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                            {formatPrice(product.priceMin)}
                          </span>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border bg-card"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scheduled dates */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Scheduling Options (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground block font-light">Start Display Date</span>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground block font-light">End Display Date</span>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Is Active Status */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-xs text-muted-foreground font-light cursor-pointer select-none">
                  Enable this bundle offer on storefront details pages immediately.
                </label>
              </div>

              {/* Modal Footer / Submit */}
              <div className="flex gap-2.5 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="flex-1 py-3 px-4 bg-secondary hover:bg-muted border border-border text-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
