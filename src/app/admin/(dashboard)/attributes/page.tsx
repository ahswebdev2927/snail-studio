"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderHeart, 
  Plus, 
  Trash2, 
  Loader2, 
  Tag, 
  X, 
  Edit3, 
  Check, 
  AlertCircle,
  Hash,
  Activity,
  Layers,
  Settings,
  HelpCircle
} from "lucide-react";

interface AttributeValue {
  id: string;
  groupId: string;
  value: string;
  code: string;
}

interface AttributeGroup {
  id: string;
  name: string;
  code: string;
  values: AttributeValue[];
}

export default function AdminAttributesPage() {
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Group Create Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");

  // Group Edit Modal State
  const [selectedGroup, setSelectedGroup] = useState<AttributeGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupCode, setEditGroupCode] = useState("");

  // Label Edit Modal State
  const [selectedLabel, setSelectedLabel] = useState<AttributeValue | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [editLabelCode, setEditLabelCode] = useState("");

  // Inline Value Adding State (keyed by groupId)
  const [inlineValueText, setInlineValueText] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null); // tracks active operation (like value adding)

  const loadAttributes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/attributes");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Error loading attributes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttributes();
  }, []);

  // Handle Group Create
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsSubmitting("group-create");
    try {
      const res = await fetch("/api/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          code: groupCode.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsGroupModalOpen(false);
        setGroupName("");
        setGroupCode("");
        await loadAttributes();
      } else {
        const err = await res.json();
        alert(`Failed to create attribute group: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setIsSubmitting(null);
    }
  };

  // Handle Group Edit
  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !editGroupName.trim()) return;

    setIsSubmitting(`group-edit-${selectedGroup.id}`);
    try {
      const res = await fetch(`/api/admin/attributes/${selectedGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editGroupName.trim(),
          code: editGroupCode.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSelectedGroup(null);
        await loadAttributes();
      } else {
        const err = await res.json();
        alert(`Failed to update group: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error editing group:", error);
    } finally {
      setIsSubmitting(null);
    }
  };

  // Handle Group Delete
  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the attribute group "${name}"? All nested values/labels and their product variants links will be deleted. This cannot be undone.`)) {
      return;
    }

    setIsSubmitting(`group-delete-${id}`);
    try {
      const res = await fetch(`/api/admin/attributes/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSelectedGroup(null);
        await loadAttributes();
      } else {
        const err = await res.json();
        alert(`Failed to delete group: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
    } finally {
      setIsSubmitting(null);
    }
  };

  // Handle Inline Add Value
  const handleAddValueInline = async (groupId: string) => {
    const text = inlineValueText[groupId] || "";
    if (!text.trim()) return;

    setIsSubmitting(`value-add-${groupId}`);
    try {
      const res = await fetch(`/api/admin/attributes/${groupId}/values`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: text.trim(),
        }),
      });

      if (res.ok) {
        setInlineValueText(prev => ({ ...prev, [groupId]: "" }));
        await loadAttributes();
      } else {
        const err = await res.json();
        alert(`Failed to add value: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error adding value:", error);
    } finally {
      setIsSubmitting(null);
    }
  };

  // Handle Label Edit
  const handleEditLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLabel || !editLabelValue.trim()) return;

    setIsSubmitting(`label-edit-${selectedLabel.id}`);
    try {
      const res = await fetch(`/api/admin/attributes/${selectedLabel.groupId}/values/${selectedLabel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: editLabelValue.trim(),
          code: editLabelCode.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSelectedLabel(null);
        await loadAttributes();
      } else {
        const err = await res.json();
        alert(`Failed to update value: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error updating label:", error);
    } finally {
      setIsSubmitting(null);
    }
  };

  // Handle Label Delete
  const handleDeleteLabel = async (groupId: string, valId: string, value: string) => {
    if (!confirm(`Are you sure you want to permanently delete the value "${value}"? Product/variant links mapped to this value will be removed.`)) {
      return;
    }

    setIsSubmitting(`value-delete-${valId}`);
    try {
      const res = await fetch(`/api/admin/attributes/${groupId}/values/${valId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadAttributes();
      } else {
        const err = await res.json();
        alert(`Failed to delete value: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error deleting value:", error);
    } finally {
      setIsSubmitting(null);
    }
  };

  const openGroupEditModal = (group: AttributeGroup) => {
    setSelectedGroup(group);
    setEditGroupName(group.name);
    setEditGroupCode(group.code);
  };

  const openLabelEditModal = (val: AttributeValue) => {
    setSelectedLabel(val);
    setEditLabelValue(val.value);
    setEditLabelCode(val.code);
  };

  // Compute metrics
  const totalGroups = groups.length;
  const totalLabels = groups.reduce((sum, g) => sum + g.values.length, 0);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">Attributes Manager</h1>
          <p className="text-xs text-muted-foreground font-light">
            Manage variant mapping parameters (Shape, Length, Finish) used to build SKU options.
          </p>
        </div>
        <div className="relative z-10">
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm shadow-primary/5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Group
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attribute Groups</span>
            <p className="font-serif text-xl font-semibold text-foreground">{totalGroups}</p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Labels / Values</span>
            <p className="font-serif text-xl font-semibold text-foreground">{totalLabels}</p>
          </div>
          <div className="p-3 rounded-2xl bg-accent/10 text-accent">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid of groups */}
      {isLoading ? (
        <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs font-light">Retrieving attributes catalog...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-primary/10 text-primary rounded-full">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h3 className="text-sm font-semibold tracking-wide">No Attributes Yet</h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              Define catalog variant options. Add parameters like Length or Texture to generate pricing variations.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div 
              key={group.id} 
              className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-5 hover:border-primary/20 transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                    {group.name}
                  </h3>
                  <span className="inline-block text-[8px] font-mono bg-secondary px-1.5 py-0.5 border border-border rounded text-muted-foreground">
                    code: {group.code}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openGroupEditModal(group)}
                    className="p-1.5 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-all border border-border/40 cursor-pointer"
                    title="Edit Group"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id, group.name)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-all border border-rose-500/20 cursor-pointer"
                    title="Delete Group"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Labels list */}
              <div className="space-y-3 flex-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Labels ({group.values.length})
                </span>
                
                {group.values.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground font-light italic">No labels added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {group.values.map((val) => {
                      const isLabelDeleting = isSubmitting === `value-delete-${val.id}`;
                      return (
                        <div 
                          key={val.id}
                          className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-secondary/40 hover:bg-secondary/70 border border-border/40 hover:border-primary/20 rounded-xl text-[10px] text-foreground font-medium transition-all group/badge relative cursor-pointer"
                          onClick={() => openLabelEditModal(val)}
                          title="Click to rename"
                        >
                          <span>{val.value}</span>
                          <span className="text-[8px] font-mono text-muted-foreground opacity-60">({val.code})</span>
                          <button
                            disabled={isLabelDeleting}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLabel(group.id, val.id, val.value);
                            }}
                            className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                            title="Remove label"
                          >
                            {isLabelDeleting ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <X className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inline input */}
              <div className="pt-3.5 border-t border-border/20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Quick add label..."
                    value={inlineValueText[group.id] || ""}
                    onChange={(e) => setInlineValueText(prev => ({ ...prev, [group.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddValueInline(group.id);
                    }}
                    className="flex-1 px-3 py-1.5 bg-secondary/15 border border-border/50 focus:border-primary focus:outline-none rounded-xl text-[10px] font-light text-foreground"
                  />
                  <button
                    onClick={() => handleAddValueInline(group.id)}
                    disabled={isSubmitting === `value-add-${group.id}`}
                    className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    {isSubmitting === `value-add-${group.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Group Create Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="font-serif text-lg font-normal text-foreground">Create Attribute Group</h3>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="p-1.5 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Group Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Length"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code Slug (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. length (auto-generated if blank)"
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border/40 bg-secondary/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting === "group-create"}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting === "group-create" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Edit Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="font-serif text-lg font-normal text-foreground">Edit Attribute Group</h3>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1.5 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditGroup}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Group Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Length"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. length"
                    value={editGroupCode}
                    onChange={(e) => setEditGroupCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border/40 bg-secondary/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting === `group-edit-${selectedGroup.id}`}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting === `group-edit-${selectedGroup.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Label Edit Modal */}
      {selectedLabel && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <h3 className="font-serif text-lg font-normal text-foreground">Edit Label / Value</h3>
              <button
                onClick={() => setSelectedLabel(null)}
                className="p-1.5 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditLabel}>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Label Value *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. High Gloss"
                    value={editLabelValue}
                    onChange={(e) => setEditLabelValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. high_gloss"
                    value={editLabelCode}
                    onChange={(e) => setEditLabelCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border/40 bg-secondary/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedLabel(null)}
                  className="px-4 py-2 bg-secondary hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting === `label-edit-${selectedLabel.id}`}
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting === `label-edit-${selectedLabel.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
