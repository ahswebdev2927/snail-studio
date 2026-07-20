"use client";

import React, { useState, useEffect } from "react";
import { customConfirm } from "@/components/ui/alert-dialog-provider";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Image as ImageIcon, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2 
} from "lucide-react";
import MediaPicker from "@/components/media/media-picker";

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  textColor: string;
  contentAlignment: "left" | "center" | "right";
  lineSpacing: "tight" | "normal" | "comfortable" | "loose";
  sortOrder: number;
  isActive: boolean;
}

// Helper to determine if hex color is light or dark for preview contrast
const isLightColor = (colorHex: string) => {
  try {
    const hex = colorHex.replace("#", "");
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 150;
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  } catch {
    return true; // default light
  }
};

const alignmentClasses: Record<string, string> = {
  left: "text-left items-start justify-start",
  center: "text-center items-center justify-center mx-auto",
  right: "text-right items-end justify-end ml-auto",
};

const lineSpacingClasses: Record<string, string> = {
  tight: "leading-tight space-y-2",
  normal: "leading-normal space-y-3",
  comfortable: "leading-relaxed space-y-4",
  loose: "leading-loose space-y-5",
};

export default function HeroBannersTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState<Partial<Banner> | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/hero-banners");
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      } else {
        showStatus("error", "Failed to retrieve hero banners.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while fetching banners.");
    } finally {
      setIsLoading(false);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const handleOpenAddModal = () => {
    if (banners.length >= 5) {
      showStatus("error", "You can only manage a maximum of 5 banners.");
      return;
    }
    setCurrentBanner({
      imageUrl: "",
      title: "",
      subtitle: "",
      ctaText: "",
      ctaLink: "",
      textColor: "#ffffff",
      contentAlignment: "center",
      lineSpacing: "normal",
      sortOrder: banners.length,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (banner: Banner) => {
    setCurrentBanner(banner);
    setIsModalOpen(true);
  };

  const handleDeleteBanner = async (id: string) => {
    if (!await customConfirm("Delete Banner", "Are you sure you want to delete this banner?")) return;
    try {
      const res = await fetch(`/api/admin/hero-banners/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showStatus("success", "Banner deleted successfully.");
        fetchBanners();
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to delete banner.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while deleting the banner.");
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBanner || !currentBanner.imageUrl || !currentBanner.title) {
      showStatus("error", "Image and Title are required.");
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const isEdit = !!currentBanner.id;
    const url = isEdit ? `/api/admin/hero-banners/${currentBanner.id}` : "/api/admin/hero-banners";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentBanner),
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
      showStatus("error", "An error occurred while saving the banner.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMediaSelect = (selected: any[]) => {
    if (selected.length > 0 && currentBanner) {
      setCurrentBanner({
        ...currentBanner,
        imageUrl: selected[0].url,
      });
    }
    setShowMediaPicker(false);
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const list = [...banners];
    const tempSort = list[index].sortOrder;
    list[index].sortOrder = list[targetIndex].sortOrder;
    list[targetIndex].sortOrder = tempSort;

    try {
      setIsSaving(true);
      await Promise.all([
        fetch(`/api/admin/hero-banners/${list[index].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: list[index].sortOrder }),
        }),
        fetch(`/api/admin/hero-banners/${list[targetIndex].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: list[targetIndex].sortOrder }),
        }),
      ]);
      showStatus("success", "Sort order updated.");
      fetchBanners();
    } catch (err) {
      console.error(err);
      showStatus("error", "Failed to update sort order.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActiveStatus = async (banner: Banner) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/hero-banners/${banner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      if (res.ok) {
        showStatus("success", `Banner ${!banner.isActive ? "activated" : "deactivated"}.`);
        fetchBanners();
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "Failed to update banner status.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-light">Loading hero banners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-normal text-foreground">Hero Carousel Banners</h2>
          <p className="text-[11px] text-muted-foreground font-light">
            Manage the hero section slider on the homepage storefront. Up to 5 active banners are supported.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenAddModal}
            disabled={banners.length >= 5}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Banner
          </button>
        </div>
      </div>

      {banners.length >= 5 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-xs flex items-center gap-3">
          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          <span>Maximum banner limit (5) reached. Remove or edit existing banners to make changes.</span>
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border text-xs leading-relaxed animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Banners List */}
      {banners.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto text-muted-foreground">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium">No Banners Configured</h3>
            <p className="text-xs text-muted-foreground font-light max-w-xs mx-auto">
              Create a hero banner to customize the top experience of your e-commerce storefront.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-secondary/40 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create First Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {banners.map((banner, index) => (
            <div 
              key={banner.id}
              className="bg-card border border-border/40 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-xs"
            >
              {/* Image Preview */}
              <div className="relative w-full md:w-60 aspect-video md:aspect-[16/9] rounded-2xl overflow-hidden bg-secondary border border-border/20 flex-none">
                {banner.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Banner details */}
              <div className="flex-1 space-y-2 text-center md:text-left w-full min-w-0">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h3 className="font-serif text-lg font-medium text-foreground truncate">{banner.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                    banner.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                  }`}>
                    {banner.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {banner.subtitle && (
                  <p className="text-xs text-muted-foreground font-light line-clamp-2 leading-relaxed">
                    {banner.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs font-light text-muted-foreground">
                  {banner.ctaText && (
                    <div>
                      <span className="font-medium text-foreground">CTA Text:</span> {banner.ctaText}
                    </div>
                  )}
                  {banner.ctaLink && (
                    <div className="truncate max-w-[200px]">
                      <span className="font-medium text-foreground">CTA Link:</span> {banner.ctaLink}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-foreground">Order:</span> {banner.sortOrder}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">Color:</span>
                    <span 
                      className="inline-block w-3 h-3 rounded-full border border-border shrink-0"
                      style={{ backgroundColor: banner.textColor || '#ffffff' }}
                    />
                    <span>{banner.textColor || '#ffffff'}</span>
                  </div>
                  <div className="capitalize">
                    <span className="font-medium text-foreground">Align:</span> {banner.contentAlignment || 'center'}
                  </div>
                  <div className="capitalize">
                    <span className="font-medium text-foreground">Spacing:</span> {banner.lineSpacing || 'normal'}
                  </div>
                </div>
              </div>

              {/* Actions panel */}
              <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto justify-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <button
                    onClick={() => moveOrder(index, "up")}
                    disabled={index === 0 || isSaving}
                    className="p-2 border border-border hover:bg-secondary/40 disabled:opacity-30 rounded-xl transition-all cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => moveOrder(index, "down")}
                    disabled={index === banners.length - 1 || isSaving}
                    className="p-2 border border-border hover:bg-secondary/40 disabled:opacity-30 rounded-xl transition-all cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => toggleActiveStatus(banner)}
                    disabled={isSaving}
                    className="p-2 border border-border hover:bg-secondary/40 rounded-xl transition-all cursor-pointer"
                    title={banner.isActive ? "Deactivate" : "Activate"}
                  >
                    {banner.isActive ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(banner)}
                    className="p-2 border border-border hover:bg-secondary/40 rounded-xl transition-all cursor-pointer"
                    title="Edit Banner"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="p-2 border border-border hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all cursor-pointer"
                    title="Delete Banner"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal Overlay */}
      {isModalOpen && currentBanner && (
        <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-card border border-border/40 rounded-3xl w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto p-6 space-y-6 my-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="font-serif text-xl font-normal text-foreground">
                {currentBanner.id ? "Edit Hero Banner" : "Add Hero Banner"}
              </h2>
              <p className="text-[10px] text-muted-foreground font-light">
                Configure your banner visuals, headlines, and call-to-actions.
              </p>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              {/* Image Input Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Banner Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={currentBanner.imageUrl || ""}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, imageUrl: e.target.value })}
                    placeholder="https://cloudinary.com/.../banner.png"
                    className="flex-1 px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="px-4 py-2.5 bg-secondary hover:bg-secondary/95 text-secondary-foreground border border-secondary rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    Select Media
                  </button>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={currentBanner.title || ""}
                  onChange={(e) => setCurrentBanner({ ...currentBanner, title: e.target.value })}
                  placeholder="Elegance at Your Fingertips"
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Subtitle
                </label>
                <textarea
                  value={currentBanner.subtitle || ""}
                  onChange={(e) => setCurrentBanner({ ...currentBanner, subtitle: e.target.value })}
                  placeholder="Indulge in couture, hand-designed press-on nails..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground resize-none"
                />
              </div>

              {/* CTA details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={currentBanner.ctaText || ""}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, ctaText: e.target.value })}
                    placeholder="Explore Collections"
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    CTA Link URL
                  </label>
                  <input
                    type="text"
                    value={currentBanner.ctaLink || ""}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, ctaLink: e.target.value })}
                    placeholder="/shop"
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>
              </div>

              {/* Custom Banner Styling */}
              <div className="border-t border-border/20 pt-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Style & Layout Customization
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Text Color Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentBanner.textColor || "#ffffff"}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val && !val.startsWith("#")) val = "#" + val;
                          setCurrentBanner({ ...currentBanner, textColor: val });
                        }}
                        placeholder="#ffffff"
                        className="flex-1 px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                      />
                      <div className="relative w-10 h-10 border border-border rounded-xl overflow-hidden shrink-0">
                        <input
                          type="color"
                          value={currentBanner.textColor || "#ffffff"}
                          onChange={(e) => setCurrentBanner({ ...currentBanner, textColor: e.target.value })}
                          className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Spacing Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Line Spacing (Height)
                    </label>
                    <select
                      value={currentBanner.lineSpacing || "normal"}
                      onChange={(e) => setCurrentBanner({ ...currentBanner, lineSpacing: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground cursor-pointer"
                    >
                      <option value="tight">Tight</option>
                      <option value="normal">Normal</option>
                      <option value="comfortable">Comfortable</option>
                      <option value="loose">Loose</option>
                    </select>
                  </div>
                </div>

                {/* Content Alignment Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Content Alignment
                  </label>
                  <div className="flex bg-secondary/30 border border-border p-1 rounded-xl gap-1">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => setCurrentBanner({ ...currentBanner, contentAlignment: align })}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                          (currentBanner.contentAlignment || "center") === align
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Real-time Settings Preview inside Modal */}
              {currentBanner.imageUrl && currentBanner.title && (
                <div className="mt-4 p-3 rounded-2xl bg-secondary/20 border border-border/30">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Live Visual Preview (Settings Only):
                  </span>
                  <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-black/10">
                    <img
                      src={currentBanner.imageUrl}
                      alt="Preview background"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 transition-colors duration-500 ${
                      (!currentBanner.textColor || isLightColor(currentBanner.textColor)) ? "bg-black/35" : "bg-black/10"
                    }`} />
                    
                    <div 
                      className={`relative z-10 px-4 w-full flex flex-col ${alignmentClasses[currentBanner.contentAlignment || 'center']} ${lineSpacingClasses[currentBanner.lineSpacing || 'normal']}`}
                      style={{ color: currentBanner.textColor || "#ffffff" }}
                    >
                      {currentBanner.subtitle && (
                        <span className="text-[8px] uppercase tracking-widest opacity-95">
                          {currentBanner.subtitle}
                        </span>
                      )}
                      <h4 className="font-serif text-xs sm:text-sm font-normal">
                        {currentBanner.title}
                      </h4>
                      {currentBanner.ctaText && (
                        <div className="pt-0.5">
                          <span 
                            className="inline-block px-3 py-1 rounded-full text-[8px] font-semibold tracking-wider uppercase transition-all shadow-xs"
                            style={{
                              backgroundColor: currentBanner.textColor || "#ffffff",
                              color: (!currentBanner.textColor || isLightColor(currentBanner.textColor)) ? "#1A1513" : "#ffffff"
                            }}
                          >
                            {currentBanner.ctaText}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Settings: sortOrder & isActive */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="isActiveCheckbox"
                    checked={currentBanner.isActive || false}
                    onChange={(e) => setCurrentBanner({ ...currentBanner, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary border-border focus:ring-primary rounded-xs cursor-pointer"
                  />
                  <label htmlFor="isActiveCheckbox" className="text-xs text-muted-foreground select-none cursor-pointer">
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

              {/* Submit Buttons */}
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
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
      {showMediaPicker && (
        <div className="fixed inset-0 z-60 bg-foreground/20 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="w-full max-w-4xl relative my-auto">
            <MediaPicker
              onSelect={handleMediaSelect}
              onClose={() => setShowMediaPicker(false)}
              maxSelection={1}
              title="Select Banner Image"
            />
          </div>
        </div>
      )}
    </div>
  );
}
