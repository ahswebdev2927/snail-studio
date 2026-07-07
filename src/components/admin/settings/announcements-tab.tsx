"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Truck,
  Tag,
  Gift,
  Star,
  Percent,
  ShoppingBag,
  Info,
  ShieldCheck,
  Megaphone,
  Settings as SettingsIcon,
  Code,
  Bold as BoldIcon,
  Link as LinkIcon
} from "lucide-react";

interface Announcement {
  id: string;
  text: string;
  icon: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  textColor: string;
  backgroundColor: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface BarSettings {
  displayMode: "rotation" | "marquee" | "static";
  marqueeSpeed: "slow" | "normal" | "fast";
  showCloseButton: boolean;
  isSticky: boolean;
}

const defaultSettings: BarSettings = {
  displayMode: "rotation",
  marqueeSpeed: "normal",
  showCloseButton: true,
  isSticky: false,
};

const iconMap: Record<string, React.ComponentType<any>> = {
  sparkles: Sparkles,
  truck: Truck,
  tag: Tag,
  gift: Gift,
  star: Star,
  percent: Percent,
  shoppingBag: ShoppingBag,
  info: Info,
  shieldCheck: ShieldCheck,
};

const iconOptions = [
  { id: "none", label: "None" },
  { id: "sparkles", label: "Sparkles", icon: Sparkles },
  { id: "truck", label: "Truck (Free Shipping)", icon: Truck },
  { id: "tag", label: "Tag (Promo)", icon: Tag },
  { id: "gift", label: "Gift (Special Offer)", icon: Gift },
  { id: "star", label: "Star (Highlight)", icon: Star },
  { id: "percent", label: "Percent (Discount)", icon: Percent },
  { id: "shoppingBag", label: "Shopping Bag (Store)", icon: ShoppingBag },
  { id: "info", label: "Info (Announcement)", icon: Info },
  { id: "shieldCheck", label: "Shield Check (Trust)", icon: ShieldCheck },
];

const colorPresets = [
  { name: "Classic Dark", bg: "#0b0f19", text: "#ffffff" },
  { name: "Rosewood Theme", bg: "#8b6e60", text: "#ffffff" },
  { name: "Liquid Gold", bg: "#e5c158", text: "#120e0d" },
  { name: "Emerald Mint", bg: "#e6f4ea", text: "#137333" },
  { name: "Crimson Sale", bg: "#fdeded", text: "#c5221f" },
  { name: "Warm Cream", bg: "#fdf5f2", text: "#8b6e60" },
];

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<BarSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAnn, setCurrentAnn] = useState<Partial<Announcement> | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    fetchAnnouncements();
    fetchSettings();
  }, []);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      } else {
        showStatus("error", "Failed to retrieve announcements.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while fetching announcements.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    setIsSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.announcement_bar_settings) {
          try {
            setSettings({
              ...defaultSettings,
              ...JSON.parse(data.announcement_bar_settings),
            });
          } catch (e) {
            console.error("Failed to parse settings JSON:", e);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const formatToDatetimeLocal = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenAddModal = () => {
    setCurrentAnn({
      text: "",
      icon: "none",
      ctaText: "",
      ctaLink: "",
      backgroundColor: "#0b0f19",
      textColor: "#ffffff",
      startDate: "",
      endDate: "",
      sortOrder: announcements.length,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ann: Announcement) => {
    setCurrentAnn({
      ...ann,
      icon: ann.icon || "none",
      startDate: ann.startDate ? formatToDatetimeLocal(ann.startDate) : "",
      endDate: ann.endDate ? formatToDatetimeLocal(ann.endDate) : "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showStatus("success", "Announcement deleted successfully.");
        fetchAnnouncements();
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to delete announcement.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while deleting the announcement.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnn || !currentAnn.text) {
      showStatus("error", "Announcement HTML/text content is required.");
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const isEdit = !!currentAnn.id;
    const url = isEdit ? `/api/admin/announcements/${currentAnn.id}` : "/api/admin/announcements";
    const method = isEdit ? "PUT" : "POST";

    const payload = {
      ...currentAnn,
      icon: currentAnn.icon === "none" ? null : currentAnn.icon,
      ctaText: currentAnn.ctaText?.trim() || null,
      ctaLink: currentAnn.ctaLink?.trim() || null,
      startDate: currentAnn.startDate || null,
      endDate: currentAnn.endDate || null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showStatus("success", `Announcement successfully ${isEdit ? "updated" : "created"}.`);
        setIsModalOpen(false);
        setCurrentAnn(null);
        fetchAnnouncements();
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to save announcement.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while saving the announcement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcement_bar_settings: JSON.stringify(settings),
        }),
      });
      if (res.ok) {
        showStatus("success", "Global bar configurations saved successfully.");
      } else {
        showStatus("error", "Failed to save global configurations.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while saving configurations.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const moveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= announcements.length) return;

    const list = [...announcements];
    const tempSort = list[index].sortOrder;
    list[index].sortOrder = list[targetIndex].sortOrder;
    list[targetIndex].sortOrder = tempSort;

    try {
      setIsSaving(true);
      await Promise.all([
        fetch(`/api/admin/announcements/${list[index].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: list[index].sortOrder }),
        }),
        fetch(`/api/admin/announcements/${list[targetIndex].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: list[targetIndex].sortOrder }),
        }),
      ]);
      showStatus("success", "Display order updated.");
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      showStatus("error", "Failed to update display order.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActiveStatus = async (ann: Announcement) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/announcements/${ann.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ann.isActive }),
      });
      if (res.ok) {
        showStatus("success", `Announcement ${!ann.isActive ? "activated" : "deactivated"}.`);
        fetchAnnouncements();
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "Failed to update announcement status.");
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (preset: typeof colorPresets[0]) => {
    if (currentAnn) {
      setCurrentAnn({
        ...currentAnn,
        backgroundColor: preset.bg,
        textColor: preset.text,
      });
    }
  };

  const insertHtmlHelper = (tagOpen: string, tagClose: string) => {
    if (!textareaRef.current || !currentAnn) return;
    const txt = currentAnn.text || "";
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = txt.substring(start, end);
    const replacement = tagOpen + selected + tagClose;
    
    const newText = txt.substring(0, start) + replacement + txt.substring(end);
    setCurrentAnn({ ...currentAnn, text: newText });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + tagOpen.length,
          start + tagOpen.length + selected.length
        );
      }
    }, 50);
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

  if (isLoading || isSettingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-light">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-normal text-foreground">Announcements</h2>
          <p className="text-[11px] text-muted-foreground font-light">
            Customize and schedule banners displayed to customers. Support rich HTML, marquee auto-scroll, and sticky layouts.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Announcement
          </button>
        </div>
      </div>

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

      {/* Global Banner Config Settings */}
      <form onSubmit={handleSaveSettings} className="bg-card border border-border/40 rounded-3xl p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-border/20 pb-3">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <h3 className="font-serif text-sm font-semibold">Global Bar Configuration</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Display Mode
            </label>
            <select
              value={settings.displayMode}
              onChange={(e) => setSettings({ ...settings, displayMode: e.target.value as any })}
              className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground cursor-pointer"
            >
              <option value="rotation">Slider Rotation (Fade Interval)</option>
              <option value="marquee">Marquee Ticker (Continuous Scroll)</option>
              <option value="static">Static (First Announcement Only)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Marquee Scroll Speed
            </label>
            <select
              value={settings.marqueeSpeed}
              disabled={settings.displayMode !== "marquee"}
              onChange={(e) => setSettings({ ...settings, marqueeSpeed: e.target.value as any })}
              className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="slow">Slow (30s Cycle)</option>
              <option value="normal">Normal (20s Cycle)</option>
              <option value="fast">Fast (10s Cycle)</option>
            </select>
          </div>

          <div className="flex flex-col justify-center space-y-1.5 pt-2">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="showCloseBtn"
                checked={settings.showCloseButton}
                onChange={(e) => setSettings({ ...settings, showCloseButton: e.target.checked })}
                className="w-4 h-4 text-primary border-border focus:ring-primary rounded-xs cursor-pointer"
              />
              <label htmlFor="showCloseBtn" className="text-xs text-muted-foreground select-none cursor-pointer">
                Show Close Button (X)
              </label>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-1.5 pt-2">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="isStickyBtn"
                checked={settings.isSticky}
                onChange={(e) => setSettings({ ...settings, isSticky: e.target.checked })}
                className="w-4 h-4 text-primary border-border focus:ring-primary rounded-xs cursor-pointer"
              />
              <label htmlFor="isStickyBtn" className="text-xs text-muted-foreground select-none cursor-pointer">
                Show on Scroll (Keep Visible)
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/10">
          <button
            type="submit"
            disabled={isSavingSettings}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-55"
          >
            {isSavingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Configurations
          </button>
        </div>
      </form>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto text-muted-foreground">
            <Megaphone className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium">No Announcements Configured</h3>
            <p className="text-xs text-muted-foreground font-light max-w-xs mx-auto">
              Create an announcement to show important promotions, notices, or discounts at the top of your shop.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-secondary/40 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create First Announcement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {announcements.map((ann, index) => {
            const ActiveIcon = ann.icon ? iconMap[ann.icon] : null;
            return (
              <div
                key={ann.id}
                className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 shadow-xs"
              >
                {/* Live Preview Header */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Live HTML Render Preview
                  </span>
                  <div
                    style={{ backgroundColor: ann.backgroundColor, color: ann.textColor }}
                    className="w-full h-11 rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-semibold uppercase tracking-widest relative overflow-hidden select-none border border-black/5 px-8"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {ActiveIcon && <ActiveIcon className="w-3.5 h-3.5 shrink-0" />}
                      <span dangerouslySetInnerHTML={{ __html: ann.text }} />
                      {ann.ctaText && (
                        <span className="underline ml-1 font-semibold">{ann.ctaText}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between pt-2 border-t border-border/20 text-xs font-light text-muted-foreground">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div>
                      <span className="font-medium text-foreground">Status:</span>{" "}
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                          ann.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ann.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {ann.ctaLink && (
                      <div className="truncate max-w-[200px]">
                        <span className="font-medium text-foreground">Legacy Link:</span>{" "}
                        <code className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-md">
                          {ann.ctaLink}
                        </code>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-foreground">Start:</span>{" "}
                      {formatDateLabel(ann.startDate)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">End:</span>{" "}
                      {formatDateLabel(ann.endDate)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Order Weight:</span> {ann.sortOrder}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => moveOrder(index, "up")}
                      disabled={index === 0 || isSaving}
                      className="p-2 border border-border hover:bg-secondary/40 disabled:opacity-30 rounded-xl transition-all cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveOrder(index, "down")}
                      disabled={index === announcements.length - 1 || isSaving}
                      className="p-2 border border-border hover:bg-secondary/40 disabled:opacity-30 rounded-xl transition-all cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActiveStatus(ann)}
                      disabled={isSaving}
                      className="p-2 border border-border hover:bg-secondary/40 rounded-xl transition-all cursor-pointer"
                      title={ann.isActive ? "Deactivate" : "Activate"}
                    >
                      {ann.isActive ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-primary" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(ann)}
                      className="p-2 border border-border hover:bg-secondary/40 rounded-xl transition-all cursor-pointer"
                      title="Edit Announcement"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ann.id)}
                      className="p-2 border border-border hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && currentAnn && (
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
                {currentAnn.id ? "Edit Announcement" : "Add Announcement"}
              </h2>
              <p className="text-[10px] text-muted-foreground font-light">
                Configure your HTML messaging, link tags, scheduling, and branding colors.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Message HTML text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Code className="w-3.5 h-3.5 text-primary" />
                    Message Content (HTML Allowed)
                  </label>
                  
                  {/* HTML insert helpers */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertHtmlHelper("<strong>", "</strong>")}
                      className="px-2 py-0.5 text-[9px] font-bold border border-border rounded bg-secondary hover:bg-muted transition-all cursor-pointer flex items-center gap-0.5 text-foreground/80"
                      title="Insert Bold Text"
                    >
                      <BoldIcon className="w-2.5 h-2.5" />
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlHelper('<a href="/shop" class="underline font-bold hover:opacity-85 transition-opacity">', '</a>')}
                      className="px-2 py-0.5 text-[9px] font-bold border border-border rounded bg-secondary hover:bg-muted transition-all cursor-pointer flex items-center gap-0.5 text-foreground/80"
                      title="Insert Link Tag"
                    >
                      <LinkIcon className="w-2.5 h-2.5" />
                      Link Tag
                    </button>
                  </div>
                </div>
                
                <textarea
                  ref={textareaRef}
                  required
                  rows={4}
                  value={currentAnn.text || ""}
                  onChange={(e) => setCurrentAnn({ ...currentAnn, text: e.target.value })}
                  placeholder='e.g. <a href="/shop" class="underline font-bold hover:opacity-80">Explore Collections</a> | Free shipping on orders above ₹1,999!'
                  className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground resize-none font-mono"
                />
                
                {/* Visual rendering preview inside modal */}
                {currentAnn.text && (
                  <div className="mt-1.5 p-3 rounded-xl bg-secondary/20 border border-border/30">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Modal Render Preview:
                    </span>
                    <div
                      style={{ backgroundColor: currentAnn.backgroundColor, color: currentAnn.textColor }}
                      className="h-10 rounded-lg flex items-center justify-center text-[10px] font-semibold uppercase tracking-widest px-4 select-none"
                    >
                      <span className="truncate flex items-center gap-1.5" dangerouslySetInnerHTML={{ __html: currentAnn.text }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Icon & Sort order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Left Icon
                  </label>
                  <select
                    value={currentAnn.icon || "none"}
                    onChange={(e) => setCurrentAnn({ ...currentAnn, icon: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground cursor-pointer"
                  >
                    {iconOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sort Order Weight
                  </label>
                  <input
                    type="number"
                    value={currentAnn.sortOrder !== undefined ? currentAnn.sortOrder : 0}
                    onChange={(e) => setCurrentAnn({ ...currentAnn, sortOrder: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>
              </div>

              {/* Branding presets & colors */}
              <div className="space-y-3 pt-2 pb-1 border-y border-border/20">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Premium Color Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="px-2.5 py-1 text-[10px] rounded-lg border border-border hover:bg-secondary/50 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span
                          style={{ backgroundColor: preset.bg, borderColor: preset.text }}
                          className="w-3 h-3 rounded-full border shrink-0"
                        />
                        <span className="font-medium text-foreground/80">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Background Color
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={currentAnn.backgroundColor || "#0b0f19"}
                        onChange={(e) => setCurrentAnn({ ...currentAnn, backgroundColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-border shrink-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={currentAnn.backgroundColor || "#0b0f19"}
                        onChange={(e) => setCurrentAnn({ ...currentAnn, backgroundColor: e.target.value })}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Text Color
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={currentAnn.textColor || "#ffffff"}
                        onChange={(e) => setCurrentAnn({ ...currentAnn, textColor: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-border shrink-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={currentAnn.textColor || "#ffffff"}
                        onChange={(e) => setCurrentAnn({ ...currentAnn, textColor: e.target.value })}
                        className="w-full px-3 py-1.5 bg-background border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Scheduling dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Start Schedule
                  </label>
                  <input
                    type="datetime-local"
                    value={currentAnn.startDate || ""}
                    onChange={(e) => setCurrentAnn({ ...currentAnn, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    End Schedule
                  </label>
                  <input
                    type="datetime-local"
                    value={currentAnn.endDate || ""}
                    onChange={(e) => setCurrentAnn({ ...currentAnn, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none transition-all text-foreground"
                  />
                </div>
              </div>

              {/* Active checkpoint toggle */}
              <div className="flex items-center gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="isActiveAnn"
                  checked={currentAnn.isActive || false}
                  onChange={(e) => setCurrentAnn({ ...currentAnn, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary border-border focus:ring-primary rounded-xs cursor-pointer"
                />
                <label htmlFor="isActiveAnn" className="text-xs text-muted-foreground select-none cursor-pointer">
                  Activate Announcement Bar
                </label>
              </div>

              {/* Footer Save & Cancel buttons */}
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
                  Save Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
