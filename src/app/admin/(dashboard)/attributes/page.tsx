"use client";

import React, { useState, useEffect, useMemo } from "react";
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

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:flex flex-col items-center z-30 w-52 transition-all duration-200 pointer-events-none">
        <div className="bg-footer-bg text-text-inverse text-[10px] font-normal leading-relaxed p-2.5 rounded-xl shadow-xl border border-border-strong text-center">
          {content}
        </div>
        <div className="w-2 h-2 bg-footer-bg rotate-45 -mt-1 border-r border-b border-border-strong" />
      </div>
    </div>
  );
}

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
  attributeType: "VARIANT" | "CATALOG";
  variantAxis: boolean;
  filterable: boolean;
  searchable: boolean;
  visibleOnPdp: boolean;
  showInDropdown: boolean;
  displayOrder: number;
  values: AttributeValue[];
}

export default function AdminAttributesPage() {
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs filter state
  const [activeFilterTab, setActiveFilterTab] = useState<"ALL" | "VARIANT" | "CATALOG">("ALL");

  const filteredGroups = useMemo(() => {
    if (activeFilterTab === "ALL") return groups;
    return groups.filter((g) => g.attributeType === activeFilterTab);
  }, [groups, activeFilterTab]);

  // Group Create Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [attributeType, setAttributeType] = useState<"VARIANT" | "CATALOG">("VARIANT");
  const [filterable, setFilterable] = useState(true);
  const [searchable, setSearchable] = useState(true);
  const [visibleOnPdp, setVisibleOnPdp] = useState(true);
  const [showInDropdown, setShowInDropdown] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number>(0);

  // Group Edit Modal State
  const [selectedGroup, setSelectedGroup] = useState<AttributeGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupCode, setEditGroupCode] = useState("");
  const [editAttributeType, setEditAttributeType] = useState<"VARIANT" | "CATALOG">("VARIANT");
  const [editFilterable, setEditFilterable] = useState(true);
  const [editSearchable, setEditSearchable] = useState(true);
  const [editVisibleOnPdp, setEditVisibleOnPdp] = useState(true);
  const [editShowInDropdown, setEditShowInDropdown] = useState(false);
  const [editDisplayOrder, setEditDisplayOrder] = useState<number>(0);

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

  const handleOpenCreateModal = () => {
    setGroupName("");
    setGroupCode("");
    setAttributeType("VARIANT");
    setFilterable(true);
    setSearchable(true);
    setVisibleOnPdp(true);
    setShowInDropdown(false);
    setDisplayOrder(0);
    setIsGroupModalOpen(true);
  };

  const handleAttributeTypeChange = (type: "VARIANT" | "CATALOG") => {
    setAttributeType(type);
    setFilterable(true);
    setSearchable(true);
    setVisibleOnPdp(true);
  };

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
          attributeType,
          filterable,
          searchable,
          visibleOnPdp,
          showInDropdown,
          displayOrder,
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
          attributeType: editAttributeType,
          filterable: editFilterable,
          searchable: editSearchable,
          visibleOnPdp: editVisibleOnPdp,
          showInDropdown: editShowInDropdown,
          displayOrder: editDisplayOrder,
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
    setEditAttributeType(group.attributeType || "VARIANT");
    setEditFilterable(group.filterable ?? true);
    setEditSearchable(group.searchable ?? true);
    setEditVisibleOnPdp(group.visibleOnPdp ?? true);
    setEditShowInDropdown(group.showInDropdown ?? false);
    setEditDisplayOrder(group.displayOrder ?? 0);
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
            onClick={handleOpenCreateModal}
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

      {/* Tabs Filter */}
      <div className="flex items-center gap-1 bg-secondary/35 border border-border/30 p-1 rounded-2xl w-fit relative z-20">
        <button
          type="button"
          onClick={() => setActiveFilterTab("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            activeFilterTab === "ALL"
              ? "bg-primary text-primary-foreground shadow-sm scale-[1.01]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        
        <button
          type="button"
          onClick={() => setActiveFilterTab("VARIANT")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer relative ${
            activeFilterTab === "VARIANT"
              ? "bg-primary text-primary-foreground shadow-sm scale-[1.01]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Variant Attributes</span>
          <Tooltip content="Used to generate unique, purchasable product variants/SKUs (e.g. Length, Shape, Size) with separate stock and pricing.">
            <HelpCircle className="w-3.5 h-3.5 opacity-60 hover:opacity-100 transition-opacity mt-px" />
          </Tooltip>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilterTab("CATALOG")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer relative ${
            activeFilterTab === "CATALOG"
              ? "bg-primary text-primary-foreground shadow-sm scale-[1.01]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Catalog Attributes</span>
          <Tooltip content="Descriptive product details used for search index suggestions, catalog navigation filters, and PDP specs lists.">
            <HelpCircle className="w-3.5 h-3.5 opacity-60 hover:opacity-100 transition-opacity mt-px" />
          </Tooltip>
        </button>
      </div>

      {/* Grid of groups */}
      {isLoading ? (
        <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs font-light">Retrieving attributes catalog...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-24 text-center bg-card border border-border/40 rounded-3xl flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-primary/10 text-primary rounded-full">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h3 className="text-sm font-semibold tracking-wide">
              {groups.length === 0 ? "No Attributes Yet" : "No Attributes Found"}
            </h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              {groups.length === 0
                ? "Define catalog variant options. Add parameters like Length or Texture to generate pricing variations."
                : "No attribute groups match the selected type filter."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <div 
              key={group.id} 
              className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-5 hover:border-primary/20 transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                    <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{group.name}</span>
                    {group.attributeType === "VARIANT" ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-info/10 text-info border border-info/20 select-none">
                        Variant Attribute
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-success/15 text-success border border-success/30 select-none">
                        Catalog Attribute
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <span className="inline-block text-[8px] font-mono bg-secondary/10 text-secondary px-1.5 py-0.5 border border-secondary/20 rounded font-medium">
                      code: {group.code}
                    </span>
                    {group.displayOrder !== 0 && (
                      <span className="inline-block text-[8px] font-mono bg-secondary/10 text-secondary px-1.5 py-0.5 border border-secondary/20 rounded font-medium">
                        order: {group.displayOrder}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openGroupEditModal(group)}
                    className="p-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 rounded-lg transition-all cursor-pointer"
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
                className="p-1.5 rounded-full hover:bg-secondary/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Code Slug</label>
                  <input
                    type="text"
                    placeholder="e.g. length (auto-generated if blank)"
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>

                <div className="space-y-2 border-t border-border/20 pt-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Attribute Type *</label>
                  <div className="grid grid-cols-1 gap-3">
                    <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${attributeType === "VARIANT" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/15"}`}>
                      <input
                        type="radio"
                        name="attributeType"
                        value="VARIANT"
                        checked={attributeType === "VARIANT"}
                        onChange={() => handleAttributeTypeChange("VARIANT")}
                        className="w-4 h-4 text-primary focus:ring-primary border-border cursor-pointer mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          Variant Attribute
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">Variant</span>
                        </span>
                        <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                          Used to create purchasable product variants. Examples: Length, Shape, Size
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${attributeType === "CATALOG" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/15"}`}>
                      <input
                        type="radio"
                        name="attributeType"
                        value="CATALOG"
                        checked={attributeType === "CATALOG"}
                        onChange={() => handleAttributeTypeChange("CATALOG")}
                        className="w-4 h-4 text-primary focus:ring-primary border-border cursor-pointer mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          Catalog Attribute
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Catalog</span>
                        </span>
                        <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                          Used for search, filters and product information. Examples: Style, Occasion, Finish
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/20 pt-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Configurations</label>
                  <div className="grid grid-cols-1 gap-2.5">
                    <label className="flex items-center gap-3 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-2xl border border-border/30 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterable}
                        onChange={(e) => setFilterable(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground">Show in Filters</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-2xl border border-border/30 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchable}
                        onChange={(e) => setSearchable(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground">Include in Search</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-2xl border border-border/30 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleOnPdp}
                        onChange={(e) => setVisibleOnPdp(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground">Show on Product Page</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-2xl border border-border/30 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showInDropdown}
                        onChange={(e) => setShowInDropdown(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground">Show in Shop Dropdown</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-border/20 pt-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Display Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border/40 bg-secondary/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 bg-transparent hover:bg-secondary/15 text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
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
              <h3 className="font-serif text-lg font-normal text-foreground flex items-center gap-2">
                Edit Attribute Group
                {editAttributeType === "VARIANT" ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Variant
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Catalog
                  </span>
                )}
              </h3>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1.5 rounded-full hover:bg-secondary/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditGroup}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
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

                <div className="space-y-2 border-t border-border/20 pt-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Attribute Type *</label>
                  <div className="grid grid-cols-1 gap-3">
                    <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${editAttributeType === "VARIANT" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/15"}`}>
                      <input
                        type="radio"
                        name="editAttributeType"
                        value="VARIANT"
                        checked={editAttributeType === "VARIANT"}
                        onChange={() => setEditAttributeType("VARIANT")}
                        className="w-4 h-4 text-primary focus:ring-primary border-border cursor-pointer mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          Variant Attribute
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">Variant</span>
                        </span>
                        <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                          Used to create purchasable product variants. Examples: Length, Shape, Size
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${editAttributeType === "CATALOG" ? "border-primary bg-primary/5" : "border-border/60 hover:bg-secondary/15"}`}>
                      <input
                        type="radio"
                        name="editAttributeType"
                        value="CATALOG"
                        checked={editAttributeType === "CATALOG"}
                        onChange={() => setEditAttributeType("CATALOG")}
                        className="w-4 h-4 text-primary focus:ring-primary border-border cursor-pointer mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          Catalog Attribute
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Catalog</span>
                        </span>
                        <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                          Used for search, filters and product information. Examples: Style, Occasion, Finish
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/20 pt-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Configurations</label>
                  <div className="grid grid-cols-1 gap-2.5">
                    <label className="flex items-center gap-3 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-2xl border border-border/30 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFilterable}
                        onChange={(e) => setEditFilterable(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground">Show in Filters</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-2xl border border-border/30 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editSearchable}
                        onChange={(e) => setEditSearchable(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground">Include in Search</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-2xl border border-border/30 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editVisibleOnPdp}
                        onChange={(e) => setEditVisibleOnPdp(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground">Show on Product Page</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-secondary/10 hover:bg-secondary/20 rounded-2xl border border-border/30 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editShowInDropdown}
                        onChange={(e) => setEditShowInDropdown(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-medium text-foreground">Show in Shop Dropdown</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-border/20 pt-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Display Order</label>
                  <input
                    type="number"
                    value={editDisplayOrder}
                    onChange={(e) => setEditDisplayOrder(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 bg-secondary/20 border border-border/70 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-border/40 bg-secondary/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 bg-transparent hover:bg-secondary/15 text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
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
                className="p-1.5 rounded-full hover:bg-secondary/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
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
                  className="px-4 py-2 bg-transparent hover:bg-secondary/15 text-foreground border border-border rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
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
