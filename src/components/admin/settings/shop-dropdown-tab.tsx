"use client";

import React, { useState, useEffect } from "react";
import { 
  Save, 
  RefreshCw, 
  Image as ImageIcon, 
  Sparkles, 
  Info,
  CheckCircle2,
  ExternalLink,
  HelpCircle
} from "lucide-react";
import MediaPicker from "@/components/media/media-picker";

interface PromoData {
  enabled: boolean;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string | null;
}

export default function ShopDropdownTab() {
  const [promo, setPromo] = useState<PromoData>({
    enabled: true,
    title: "Blush Quartz Collection",
    subtitle: "Our bestseller soft pink quartz marble set designed for luxury vibes.",
    ctaText: "Shop Now",
    ctaLink: "/shop",
    imageUrl: null,
  });

  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Summary States
  const [activeAttributes, setActiveAttributes] = useState<string[]>([]);
  const [activeCollections, setActiveCollections] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Load Settings
        const settingsRes = await fetch("/api/admin/settings");
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings.shop_dropdown_promo) {
            try {
              const parsedPromo = JSON.parse(settings.shop_dropdown_promo);
              setPromo({
                enabled: parsedPromo.enabled ?? true,
                title: parsedPromo.title || "",
                subtitle: parsedPromo.subtitle || "",
                ctaText: parsedPromo.ctaText || "Shop Now",
                ctaLink: parsedPromo.ctaLink || "/shop",
                imageUrl: parsedPromo.imageUrl || null,
              });
            } catch (e) {
              console.error("Failed to parse shop_dropdown_promo setting:", e);
            }
          }
        }

        // Load summary lists
        const [attrRes, colRes, catRes] = await Promise.all([
          fetch("/api/admin/attributes"),
          fetch("/api/admin/collections"),
          fetch("/api/categories")
        ]);

        if (attrRes.ok) {
          const attrs = await attrRes.json();
          setActiveAttributes(
            attrs.filter((a: any) => a.showInDropdown).map((a: any) => a.name)
          );
        }
        if (colRes.ok) {
          const cols = await colRes.json();
          setActiveCollections(
            cols.filter((c: any) => c.isActive && c.showInDropdown).map((c: any) => c.name)
          );
        }
        if (catRes.ok) {
          const cats = await catRes.json();
          setActiveCategories(
            cats.filter((c: any) => c.showInDropdown).map((c: any) => c.name)
          );
        }
      } catch (err) {
        console.error("Failed to load storefront dropdown configuration:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleMediaSelect = (selected: any[]) => {
    if (selected.length > 0) {
      setPromo(prev => ({ ...prev, imageUrl: selected[0].url }));
    }
    setShowMediaPicker(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_dropdown_promo: JSON.stringify(promo),
        }),
      });

      if (res.ok) {
        alert("Shop dropdown settings saved successfully!");
      } else {
        const err = await res.json();
        alert(`Failed to save settings: ${err.error || "Server error"}`);
      }
    } catch (err) {
      console.error("Error saving dropdown settings:", err);
      alert("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <RefreshCw className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <h3 className="font-serif text-lg font-normal text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Featured Dropdown Banner
            </h3>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={promo.enabled}
                onChange={(e) => setPromo(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4.5 h-4.5 rounded text-primary focus:ring-primary border-border cursor-pointer"
              />
              <span className="text-xs font-semibold text-foreground">Enable Banner</span>
            </label>
          </div>

          <p className="text-xs text-muted-foreground font-light leading-relaxed">
            Customize the promotion card that is displayed on the right sidebar of the storefront Shop mega menu.
          </p>

          <div className={`space-y-4.5 transition-all duration-300 ${promo.enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            {/* Banner Image URL */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Banner Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required={promo.enabled}
                  value={promo.imageUrl || ""}
                  onChange={(e) => setPromo(prev => ({ ...prev, imageUrl: e.target.value || null }))}
                  placeholder="https://res.cloudinary.com/.../image.jpg"
                  className="flex-1 px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="px-4 py-2.5 bg-transparent hover:bg-secondary/15 text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer shrink-0"
                >
                  Select Media
                </button>
              </div>
            </div>

            {/* Banner Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Banner Title
              </label>
              <input
                type="text"
                required={promo.enabled}
                value={promo.title}
                onChange={(e) => setPromo(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Blush Quartz Collection"
                className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
              />
            </div>

            {/* Banner Subtitle / Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Banner Subtitle
              </label>
              <textarea
                rows={3}
                required={promo.enabled}
                value={promo.subtitle}
                onChange={(e) => setPromo(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Short description of the collection/offer..."
                className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground resize-none"
              />
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  required={promo.enabled}
                  value={promo.ctaText}
                  onChange={(e) => setPromo(prev => ({ ...prev, ctaText: e.target.value }))}
                  placeholder="e.g. Shop Now"
                  className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  CTA Redirect URL
                </label>
                <input
                  type="text"
                  required={promo.enabled}
                  value={promo.ctaLink}
                  onChange={(e) => setPromo(prev => ({ ...prev, ctaLink: e.target.value }))}
                  placeholder="e.g. /shop?collection=blush-quartz"
                  className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border/30 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-primary/10"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Dropdown Config
          </button>
        </div>
      </form>

      {/* Dropdown Menu Columns Summary */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-secondary/15 border border-border/40 rounded-3xl p-6 space-y-5">
          <h4 className="font-serif text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border/20 pb-3">
            <Info className="w-4 h-4 text-primary" />
            Dropdown Menu Status
          </h4>

          <div className="space-y-4.5">
            {/* Attribute Groups */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                Active Attribute Columns
              </span>
              {activeAttributes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeAttributes.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                      Shop by {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-light text-muted-foreground italic">
                  No attributes are configured to show in dropdown yet.
                </p>
              )}
            </div>

            {/* Categories */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                Dropdown Category Links
              </span>
              {activeCategories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeCategories.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-light text-muted-foreground italic">
                  No categories are configured to show in dropdown.
                </p>
              )}
            </div>

            {/* Collections */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                Dropdown Collection Links
              </span>
              {activeCollections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeCollections.map(name => (
                    <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400">
                      <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] font-light text-muted-foreground italic">
                  No collections are configured to show in dropdown.
                </p>
              )}
            </div>
          </div>

          <div className="bg-card p-3 rounded-2xl border border-border/20 flex gap-2">
            <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] font-light text-muted-foreground leading-normal">
              To add or remove links, go to the respective **Attributes Manager**, **Categories**, or **Collections** sections under the Catalog sidebar and check the "Show in Shop Dropdown" option.
            </p>
          </div>
        </div>
      </div>

      {/* Cloudinary Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-60 bg-foreground/20 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-card border border-border/40 rounded-3xl w-full max-w-4xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto relative my-auto">
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
