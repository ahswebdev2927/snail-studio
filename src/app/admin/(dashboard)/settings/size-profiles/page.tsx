"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Ruler,
  Save,
  X,
  Eye,
  EyeOff
} from "lucide-react";

interface SizeProfile {
  id: string;
  name: string;
  description: string;
  thumb: number;
  index: number;
  middle: number;
  ring: number;
  pinky: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSizeProfilesPage() {
  const [profiles, setProfiles] = useState<SizeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Partial<SizeProfile> | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/size-profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      } else {
        showStatus("error", "Failed to retrieve size profiles.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while fetching size profiles.");
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
    setCurrentProfile({
      name: "",
      description: "",
      thumb: 16,
      index: 12,
      middle: 13,
      ring: 12,
      pinky: 10,
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (profile: SizeProfile) => {
    setCurrentProfile(profile);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete size profile "${name}"? This will affect calculator logic for this standard.`)) return;
    try {
      const res = await fetch(`/api/admin/size-profiles/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showStatus("success", "Size profile deleted successfully.");
        fetchProfiles();
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to delete size profile.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while deleting the size profile.");
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!currentProfile) return false;

    if (!currentProfile.name || currentProfile.name.trim() === "") {
      errors.name = "Name is required.";
    } else if (currentProfile.name.length > 20) {
      errors.name = "Name must be 20 characters or less.";
    }

    if (currentProfile.description && currentProfile.description.length > 200) {
      errors.description = "Description must be 200 characters or less.";
    }

    const checkFinger = (val: any, label: string) => {
      const num = Number(val);
      if (isNaN(num) || !Number.isInteger(num)) {
        return `${label} must be a whole number.`;
      }
      if (num < 5 || num > 25) {
        return `${label} must be between 5mm and 25mm.`;
      }
      return null;
    };

    const tErr = checkFinger(currentProfile.thumb, "Thumb");
    if (tErr) errors.thumb = tErr;

    const iErr = checkFinger(currentProfile.index, "Index");
    if (iErr) errors.index = iErr;

    const mErr = checkFinger(currentProfile.middle, "Middle");
    if (mErr) errors.middle = mErr;

    const rErr = checkFinger(currentProfile.ring, "Ring");
    if (rErr) errors.ring = rErr;

    const pErr = checkFinger(currentProfile.pinky, "Pinky");
    if (pErr) errors.pinky = pErr;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !currentProfile) return;

    setIsSaving(true);
    setStatusMessage(null);

    const isEdit = !!currentProfile.id;
    const url = isEdit ? `/api/admin/size-profiles/${currentProfile.id}` : "/api/admin/size-profiles";
    const method = isEdit ? "PUT" : "POST";

    // Ensure types are correct
    const payload = {
      ...currentProfile,
      thumb: Number(currentProfile.thumb),
      index: Number(currentProfile.index),
      middle: Number(currentProfile.middle),
      ring: Number(currentProfile.ring),
      pinky: Number(currentProfile.pinky),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showStatus("success", `Size profile "${currentProfile.name}" successfully ${isEdit ? "updated" : "created"}.`);
        setIsModalOpen(false);
        setCurrentProfile(null);
        fetchProfiles();
      } else {
        const errData = await res.json();
        // Map duplicate API errors back to validation fields if possible
        if (errData.error === "Duplicate name" && errData.details) {
          setFormErrors(errData.details);
        } else {
          showStatus("error", errData.error || "Failed to save size profile.");
        }
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while saving the size profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActiveStatus = async (profile: SizeProfile) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/admin/size-profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !profile.isActive }),
      });
      if (res.ok) {
        showStatus("success", `Size profile "${profile.name}" ${!profile.isActive ? "activated" : "deactivated"}.`);
        fetchProfiles();
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "Failed to update size profile status.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-light">Loading size profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Sizing Profiles</h1>
          <p className="text-xs text-muted-foreground font-light">
            Manage standard sizes (XS, S, M, L) and their millimeter measurements. These values drive the interactive calculator and size chart on the storefront.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Profile
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

      {/* Profiles Table */}
      {profiles.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto text-muted-foreground">
            <Ruler className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium">No Size Profiles Configured</h3>
            <p className="text-xs text-muted-foreground font-light max-w-xs mx-auto">
              Create standard size profiles to display on the storefront sizing chart and configure recommendations.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-secondary/40 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create First Profile
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-light">
              <thead>
                <tr className="border-b border-border/40 text-foreground font-semibold bg-secondary/15">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6 text-center">Thumb</th>
                  <th className="py-4 px-6 text-center">Index</th>
                  <th className="py-4 px-6 text-center">Middle</th>
                  <th className="py-4 px-6 text-center">Ring</th>
                  <th className="py-4 px-6 text-center">Pinky</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/25">
                {profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="py-4 px-6 font-semibold text-primary">{profile.name}</td>
                    <td className="py-4 px-6 text-muted-foreground max-w-xs truncate">{profile.description || "—"}</td>
                    <td className="py-4 px-6 text-center font-mono">{profile.thumb} mm</td>
                    <td className="py-4 px-6 text-center font-mono">{profile.index} mm</td>
                    <td className="py-4 px-6 text-center font-mono">{profile.middle} mm</td>
                    <td className="py-4 px-6 text-center font-mono">{profile.ring} mm</td>
                    <td className="py-4 px-6 text-center font-mono">{profile.pinky} mm</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => toggleActiveStatus(profile)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider cursor-pointer border ${
                          profile.isActive
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
                            : "bg-muted text-muted-foreground border-border/30"
                        }`}
                      >
                        {profile.isActive ? (
                          <>
                            <Eye className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Disabled
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(profile)}
                          className="p-2 text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-secondary/40 cursor-pointer"
                          aria-label="Edit size profile"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(profile.id, profile.name)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-all rounded-lg hover:bg-destructive/10 cursor-pointer"
                          aria-label="Delete size profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && currentProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-card border border-border/40 rounded-3xl shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h2 className="font-serif text-lg text-foreground font-semibold">
                {currentProfile.id ? "Edit Size Profile" : "Add New Size Profile"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Profile Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-foreground">Profile Name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="e.g. XS, S, M, L, XL"
                    value={currentProfile.name || ""}
                    onChange={(e) => setCurrentProfile({ ...currentProfile, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs bg-background/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {formErrors.name && (
                    <span className="text-[10px] text-destructive block font-medium">{formErrors.name}</span>
                  )}
                </div>

                {/* Profile Description */}
                <div className="space-y-1.5">
                  <label htmlFor="description" className="text-xs font-semibold text-foreground">Description</label>
                  <input
                    id="description"
                    type="text"
                    placeholder="e.g. Petite hands, Average / Standard hands"
                    value={currentProfile.description || ""}
                    onChange={(e) => setCurrentProfile({ ...currentProfile, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs bg-background/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {formErrors.description && (
                    <span className="text-[10px] text-destructive block font-medium">{formErrors.description}</span>
                  )}
                </div>

                <hr className="border-border/30 my-2" />

                {/* Finger Width Settings in Grid */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-foreground block">Millimeter Widths (5mm to 25mm)</span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Thumb */}
                    <div className="space-y-1.5">
                      <label htmlFor="thumb" className="text-[11px] font-semibold text-muted-foreground">Thumb Width</label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="thumb"
                          type="number"
                          min="5"
                          max="25"
                          value={currentProfile.thumb ?? ""}
                          onChange={(e) => setCurrentProfile({ ...currentProfile, thumb: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.thumb && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.thumb}</span>
                      )}
                    </div>

                    {/* Index */}
                    <div className="space-y-1.5">
                      <label htmlFor="index" className="text-[11px] font-semibold text-muted-foreground">Index Width</label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="index"
                          type="number"
                          min="5"
                          max="25"
                          value={currentProfile.index ?? ""}
                          onChange={(e) => setCurrentProfile({ ...currentProfile, index: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.index && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.index}</span>
                      )}
                    </div>

                    {/* Middle */}
                    <div className="space-y-1.5">
                      <label htmlFor="middle" className="text-[11px] font-semibold text-muted-foreground">Middle Width</label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="middle"
                          type="number"
                          min="5"
                          max="25"
                          value={currentProfile.middle ?? ""}
                          onChange={(e) => setCurrentProfile({ ...currentProfile, middle: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.middle && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.middle}</span>
                      )}
                    </div>

                    {/* Ring */}
                    <div className="space-y-1.5">
                      <label htmlFor="ring" className="text-[11px] font-semibold text-muted-foreground">Ring Width</label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="ring"
                          type="number"
                          min="5"
                          max="25"
                          value={currentProfile.ring ?? ""}
                          onChange={(e) => setCurrentProfile({ ...currentProfile, ring: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.ring && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.ring}</span>
                      )}
                    </div>

                    {/* Pinky */}
                    <div className="space-y-1.5">
                      <label htmlFor="pinky" className="text-[11px] font-semibold text-muted-foreground">Pinky Width</label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="pinky"
                          type="number"
                          min="5"
                          max="25"
                          value={currentProfile.pinky ?? ""}
                          onChange={(e) => setCurrentProfile({ ...currentProfile, pinky: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.pinky && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.pinky}</span>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-border/30 my-2" />

                {/* Status Toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={currentProfile.isActive ?? true}
                    onChange={(e) => setCurrentProfile({ ...currentProfile, isActive: e.target.checked })}
                    className="w-4.5 h-4.5 accent-primary border border-border rounded-md cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-foreground cursor-pointer">
                    Enable Sizing Profile (display on storefront)
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-secondary/40 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
