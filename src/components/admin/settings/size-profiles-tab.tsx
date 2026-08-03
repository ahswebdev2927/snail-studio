import React, { useState, useEffect } from "react";
import { customConfirm } from "@/components/ui/alert-dialog-provider";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSizeProfileSchema } from "@/lib/validators/settings";
import { notify } from "@/lib/toast";

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

export default function SizeProfilesTab() {
  const [profiles, setProfiles] = useState<SizeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Partial<SizeProfile> | null>(null);

  // RHF Setup
  const form = useForm({
    resolver: zodResolver(createSizeProfileSchema),
    defaultValues: {
      name: "",
      description: "",
      thumb: 16,
      index: 12,
      middle: 13,
      ring: 12,
      pinky: 10,
      isActive: true,
    },
    mode: "onBlur",
  });

  const formErrors = form.formState.errors;

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
    if (type === "success") {
      notify.success(text);
    } else {
      notify.error(text);
    }
  };

  const handleOpenAddModal = () => {
    setCurrentProfile({} as any);
    form.reset({
      name: "",
      description: "",
      thumb: 16,
      index: 12,
      middle: 13,
      ring: 12,
      pinky: 10,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (profile: SizeProfile) => {
    setCurrentProfile(profile);
    form.reset({
      name: profile.name,
      description: profile.description || "",
      thumb: profile.thumb,
      index: profile.index,
      middle: profile.middle,
      ring: profile.ring,
      pinky: profile.pinky,
      isActive: profile.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!await customConfirm("Delete Size Profile", `Are you sure you want to delete size profile "${name}"? This will affect calculator logic for this standard.`)) return;
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

  const handleSaveProfile = async (data: any) => {
    setIsSaving(true);

    const isEdit = !!currentProfile?.id;
    const url = isEdit ? `/api/admin/size-profiles/${currentProfile?.id}` : "/api/admin/size-profiles";
    const method = isEdit ? "PUT" : "POST";

    const payload = {
      ...data,
      id: currentProfile?.id,
      thumb: Number(data.thumb),
      index: Number(data.index),
      middle: Number(data.middle),
      ring: Number(data.ring),
      pinky: Number(data.pinky),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showStatus("success", `Size profile "${data.name}" successfully ${isEdit ? "updated" : "created"}.`);
        setIsModalOpen(false);
        setCurrentProfile(null);
        fetchProfiles();
      } else {
        const errData = await res.json();
        if (errData.error === "Duplicate name" && errData.details) {
          form.setError("name", { type: "server", message: errData.error });
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
      <div className="flex items-center justify-center min-h-[300px]">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-normal text-foreground">Sizing Profiles</h2>
          <p className="text-[11px] text-muted-foreground font-light">
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
                        type="button"
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
                          type="button"
                          onClick={() => handleOpenEditModal(profile)}
                          className="p-2 text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-secondary/40 cursor-pointer"
                          aria-label="Edit size profile"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
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
          <div className="relative w-full max-w-lg bg-card border border-border/40 rounded-3xl shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h2 className="font-serif text-lg text-foreground font-semibold">
                {currentProfile.id ? "Edit Size Profile" : "Add New Size Profile"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={form.handleSubmit(handleSaveProfile)} className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Profile Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-foreground">Profile Name</label>
                  <input
                    {...form.register("name")}
                    id="name"
                    type="text"
                    placeholder="e.g. XS, S, M, L, XL"
                    className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs bg-background/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {formErrors.name && (
                    <span className="text-[10px] text-destructive block font-medium">{formErrors.name.message}</span>
                  )}
                </div>

                {/* Profile Description */}
                <div className="space-y-1.5">
                  <label htmlFor="description" className="text-xs font-semibold text-foreground">Description</label>
                  <input
                    {...form.register("description")}
                    id="description"
                    type="text"
                    placeholder="e.g. Petite hands, Average / Standard hands"
                    className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs bg-background/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {formErrors.description && (
                    <span className="text-[10px] text-destructive block font-medium">{formErrors.description.message}</span>
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
                          {...form.register("thumb", { valueAsNumber: true })}
                          id="thumb"
                          type="number"
                          min="5"
                          max="25"
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.thumb && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.thumb.message}</span>
                      )}
                    </div>

                    {/* Index */}
                    <div className="space-y-1.5">
                      <label htmlFor="index" className="text-[11px] font-semibold text-muted-foreground">Index Width</label>
                      <div className="flex gap-2 items-center">
                        <input
                          {...form.register("index", { valueAsNumber: true })}
                          id="index"
                          type="number"
                          min="5"
                          max="25"
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.index && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.index.message}</span>
                      )}
                    </div>

                    {/* Middle */}
                    <div className="space-y-1.5">
                      <label htmlFor="middle" className="text-[11px] font-semibold text-muted-foreground">Middle Width</label>
                      <div className="flex gap-2 items-center">
                        <input
                          {...form.register("middle", { valueAsNumber: true })}
                          id="middle"
                          type="number"
                          min="5"
                          max="25"
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.middle && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.middle.message}</span>
                      )}
                    </div>

                    {/* Ring */}
                    <div className="space-y-1.5">
                      <label htmlFor="ring" className="text-[11px] font-semibold text-muted-foreground">Ring Width</label>
                      <div className="flex gap-2 items-center">
                        <input
                          {...form.register("ring", { valueAsNumber: true })}
                          id="ring"
                          type="number"
                          min="5"
                          max="25"
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.ring && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.ring.message}</span>
                      )}
                    </div>

                    {/* Pinky */}
                    <div className="space-y-1.5">
                      <label htmlFor="pinky" className="text-[11px] font-semibold text-muted-foreground">Pinky Width</label>
                      <div className="flex gap-2 items-center">
                        <input
                          {...form.register("pinky", { valueAsNumber: true })}
                          id="pinky"
                          type="number"
                          min="5"
                          max="25"
                          className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <span className="text-[11px] text-muted-foreground">mm</span>
                      </div>
                      {formErrors.pinky && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.pinky.message}</span>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-border/30 my-2" />

                {/* Status Toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    {...form.register("isActive")}
                    id="isActive"
                    type="checkbox"
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
                  className="px-4.5 py-2.5 rounded-xl border border-border hover:bg-secondary/40 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
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
