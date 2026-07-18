"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon
} from "lucide-react";
import MediaPicker from "@/components/media/media-picker";

interface LaunchBanner {
  id: string;
  productId: string;
  title: string;
  subtitle: string | null;
  backgroundImage: string | null;
  productImage: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  status: string;
}

export default function LaunchBannersTab() {
  const [banners, setBanners] = useState<LaunchBanner[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<LaunchBanner> | null>(null);
  const [mediaPickerConfig, setMediaPickerConfig] = useState<{ isOpen: boolean; field: "backgroundImage" | "productImage" } | null>(null);

  useEffect(() => {
    fetchBanners();
    fetchProducts();
  }, []);

  const fetchBanners = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/launch-banners");
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      } else {
        showStatus("error", "Failed to load launch banners.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while loading banners.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProductsList(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleOpenAddModal = () => {
    setCurrentBanner({
      productId: "",
      title: "",
      subtitle: "",
      backgroundImage: "",
      productImage: "",
      sortOrder: banners.length,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (banner: LaunchBanner) => {
    setCurrentBanner({
      ...banner,
      subtitle: banner.subtitle || "",
      backgroundImage: banner.backgroundImage || "",
      productImage: banner.productImage || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this launch banner?")) return;
    try {
      const res = await fetch(`/api/admin/launch-banners/${id}`, { method: "DELETE" });
      if (res.ok) {
        showStatus("success", "Banner deleted successfully.");
        fetchBanners();
      } else {
        showStatus("error", "Failed to delete banner.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while deleting banner.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBanner || !currentBanner.productId || !currentBanner.title) {
      showStatus("error", "Product selection and title are required.");
      return;
    }

    setIsSaving(true);
    const isEdit = !!currentBanner.id;
    const url = isEdit ? `/api/admin/launch-banners/${currentBanner.id}` : "/api/admin/launch-banners";
    const method = isEdit ? "PUT" : "POST";

    const payload = {
      productId: currentBanner.productId,
      title: currentBanner.title,
      subtitle: currentBanner.subtitle?.trim() || null,
      backgroundImage: currentBanner.backgroundImage?.trim() || null,
      productImage: currentBanner.productImage?.trim() || null,
      sortOrder: Number(currentBanner.sortOrder) || 0,
      isActive: !!currentBanner.isActive,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showStatus("success", `Banner successfully ${isEdit ? "updated" : "created"}.`);
        setIsModalOpen(false);
        setCurrentBanner(null);
        fetchBanners();
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to save banner.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while saving banner.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMediaSelect = (selected: any[]) => {
    if (selected.length > 0 && currentBanner && mediaPickerConfig) {
      setCurrentBanner({
        ...currentBanner,
        [mediaPickerConfig.field]: selected[0].url,
      });
    }
    setMediaPickerConfig(null);
  };

  const getProductName = (prodId: string) => {
    return productsList.find(p => p.id === prodId)?.name || "Unknown Product";
  };

  return (
    <div className="space-y-6 text-foreground">
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-semibold tracking-wide">Launch Banner Carousel</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage banner campaigns for Coming Soon & Launching Soon drops. If multiple are active, they will render as a homepage slider.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Launch Banner
        </button>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2.5 p-4 rounded-2xl border text-xs animate-in fade-in slide-in-from-top-1 duration-200 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          {statusMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Banners List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Loading banners...</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="border border-border/40 bg-card/30 rounded-3xl p-16 text-center">
          <LinkIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-sm font-semibold">No active launch banners</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto font-light">
            Create a launch banner to display interactive drop countdowns and notifications on your storefront.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex items-center gap-4 p-4 bg-card border border-border/40 rounded-3xl hover:border-primary/10 transition-all justify-between"
            >
              {/* Left preview info */}
              <div className="flex items-center gap-4 min-w-0">
                {banner.backgroundImage ? (
                  <div className="w-20 h-12 rounded-lg overflow-hidden border border-border shrink-0 bg-secondary/20">
                    <img src={banner.backgroundImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-12 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0 text-[10px] text-muted-foreground border border-dashed border-border">
                    No BG
                  </div>
                )}

                <div className="min-w-0">
                  <h4 className="text-xs font-semibold truncate text-foreground">{banner.title}</h4>
                  {banner.subtitle && <p className="text-[11px] text-muted-foreground truncate font-light mt-0.5">{banner.subtitle}</p>}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[9px] bg-secondary/80 text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      Product: {getProductName(banner.productId)}
                    </span>
                    <span className="text-[9px] bg-secondary/80 text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      Sort: {banner.sortOrder}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        banner.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-slate-500/10 text-slate-500"
                      }`}
                    >
                      {banner.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditModal(banner)}
                  className="p-2 border border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer"
                  title="Edit Banner"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="p-2 border border-border hover:bg-rose-500/10 hover:border-rose-500/20 text-muted-foreground hover:text-rose-500 rounded-xl transition-all cursor-pointer"
                  title="Delete Banner"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && currentBanner && (
        <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-card border border-border/40 rounded-3xl w-full max-w-lg shadow-2xl relative p-6 space-y-6 my-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-serif text-lg font-normal text-foreground">
                {currentBanner.id ? "Edit Launch Banner" : "New Launch Banner"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-light">
                Configure content and imagery for the product launch preview.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Product Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Launch Product
                </label>
                <select
                  value={currentBanner.productId || ""}
                  onChange={(e) => setCurrentBanner({ ...currentBanner, productId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground cursor-pointer"
                  required
                >
                  <option value="">-- Select a Preview or Launch Product --</option>
                  {productsList
                    .filter(p => p.status === "Coming Soon" || p.status === "Launching Soon")
                    .map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.status})
                      </option>
                    ))}
                </select>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Banner Title
                </label>
                <input
                  type="text"
                  value={currentBanner.title || ""}
                  onChange={(e) => setCurrentBanner({ ...currentBanner, title: e.target.value })}
                  placeholder="e.g. Autumn Glow Collection Drop"
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Banner Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={currentBanner.subtitle || ""}
                  onChange={(e) => setCurrentBanner({ ...currentBanner, subtitle: e.target.value })}
                  placeholder="e.g. Exquisite handcrafted gel-press sets dropping soon"
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  maxLength={200}
                />
              </div>

              {/* Custom background image */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Banner Background Image URL (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentBanner.backgroundImage || ""}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, backgroundImage: e.target.value })}
                    placeholder="https://res.cloudinary.com/..."
                    className="flex-1 px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerConfig({ isOpen: true, field: "backgroundImage" })}
                    className="px-4 py-2.5 bg-secondary hover:bg-secondary/90 border border-secondary text-xs rounded-xl cursor-pointer"
                  >
                    Pick
                  </button>
                </div>
              </div>

              {/* Custom product thumbnail */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Featured Product Thumbnail URL (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentBanner.productImage || ""}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, productImage: e.target.value })}
                    placeholder="https://res.cloudinary.com/..."
                    className="flex-1 px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerConfig({ isOpen: true, field: "productImage" })}
                    className="px-4 py-2.5 bg-secondary hover:bg-secondary/90 border border-secondary text-xs rounded-xl cursor-pointer"
                  >
                    Pick
                  </button>
                </div>
              </div>

              {/* Sort Order and Active check */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="flex items-center gap-2.5 pt-4">
                  <input
                    type="checkbox"
                    id="isActiveBanner"
                    checked={currentBanner.isActive || false}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary border-border focus:ring-primary rounded-xs cursor-pointer"
                  />
                  <label htmlFor="isActiveBanner" className="text-xs text-muted-foreground select-none cursor-pointer">
                    Active on Storefront
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block text-right">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={currentBanner.sortOrder !== undefined ? currentBanner.sortOrder : 0}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, sortOrder: parseInt(e.target.value, 10) || 0 })}
                    className="w-20 px-3 py-1.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-right transition-all ml-auto block text-foreground"
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 border-t border-border/20 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2.5 border border-border hover:bg-secondary/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cloudinary Media Picker Modal */}
      {mediaPickerConfig?.isOpen && (
        <div className="fixed inset-0 z-60 bg-foreground/20 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="w-full max-w-4xl relative my-auto">
            <MediaPicker
              onSelect={handleMediaSelect}
              onClose={() => setMediaPickerConfig(null)}
              maxSelection={1}
              title={`Select ${mediaPickerConfig.field === "backgroundImage" ? "Background" : "Product"} Image`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
