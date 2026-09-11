"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronRight, ChevronDown, Check, Folder, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryItem {
  id: string;
  name: string;
  parentId: string | null;
  [key: string]: any;
}

export interface CascadingCategorySelectProps {
  categories: CategoryItem[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showFullPath?: boolean;
  showCheckbox?: boolean;
  showRootOption?: boolean;
  rootOptionLabel?: string;
  appendName?: string;
  excludeId?: string;
}

export function CascadingCategorySelect({
  categories,
  value,
  onChange,
  placeholder = "Select Parent Category...",
  className,
  disabled = false,
  showFullPath = false,
  showCheckbox = false,
  showRootOption = false,
  rootOptionLabel = "No Parent (Root Node)",
  appendName = "",
  excludeId,
}: CascadingCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter out excluded ID and its descendants if excludeId is provided
  const filteredCategories = useMemo(() => {
    if (!excludeId) return categories;

    // Collect all descendant IDs of excludeId
    const invalidIds = new Set<string>([excludeId]);
    let added = true;
    while (added) {
      added = false;
      categories.forEach((cat) => {
        if (cat.parentId && invalidIds.has(cat.parentId) && !invalidIds.has(cat.id)) {
          invalidIds.add(cat.id);
          added = true;
        }
      });
    }

    return categories.filter((cat) => !invalidIds.has(cat.id));
  }, [categories, excludeId]);

  // Map category IDs to items
  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryItem>();
    filteredCategories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [filteredCategories]);

  // Group children by parentId ('root' for top-level)
  const childrenMap = useMemo(() => {
    const map = new Map<string, CategoryItem[]>();
    filteredCategories.forEach((cat) => {
      const pid = cat.parentId || "root";
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(cat);
    });
    return map;
  }, [filteredCategories]);

  // Compute full path for selected value: [GrandParent, Parent, Child]
  const selectedPath = useMemo(() => {
    if (!value) return [];
    const path: CategoryItem[] = [];
    let curr = categoryMap.get(value);
    while (curr) {
      path.unshift(curr);
      curr = curr.parentId ? categoryMap.get(curr.parentId) : undefined;
    }
    return path;
  }, [value, categoryMap]);

  // Active expanded path column levels while browsing: [level0CatId, level1CatId, ...]
  const [expandedPath, setExpandedPath] = useState<string[]>([]);

  // Initialize expandedPath when dropdown opens or value changes
  useEffect(() => {
    if (isOpen) {
      if (selectedPath.length > 0) {
        setExpandedPath(selectedPath.map((item) => item.id));
      } else {
        setExpandedPath([]);
      }
    }
  }, [isOpen, selectedPath]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Compute columns to display based on expandedPath
  const columns = useMemo(() => {
    const cols: CategoryItem[][] = [];

    // Root level column
    const rootCats = childrenMap.get("root") || [];
    if (rootCats.length > 0 || showRootOption) {
      cols.push(rootCats);
    }

    for (let i = 0; i < expandedPath.length; i++) {
      const parentId = expandedPath[i];
      const children = childrenMap.get(parentId) || [];
      if (children.length > 0) {
        cols.push(children);
      } else {
        break;
      }
    }

    return cols;
  }, [childrenMap, expandedPath, showRootOption]);

  const handleItemHover = (levelIndex: number, itemId: string) => {
    const newPath = expandedPath.slice(0, levelIndex);
    if (itemId) {
      const hasChildren = (childrenMap.get(itemId) || []).length > 0;
      if (hasChildren) {
        newPath.push(itemId);
      }
    }
    setExpandedPath(newPath);
  };

  const handleItemSelect = (catId: string | null) => {
    onChange(catId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setExpandedPath([]);
  };

  // Build live path text for trigger button: parent 1 / parent 2 / new-category-name
  const livePathDisplay = useMemo(() => {
    const pathNames = selectedPath.map((item) => item.name);
    
    if (appendName.trim()) {
      pathNames.push(appendName.trim());
    }

    if (pathNames.length > 0) {
      return pathNames.join(" / ");
    }

    if (value === null || value === "") {
      return rootOptionLabel;
    }

    const selectedCategory = categoryMap.get(value || "");
    if (selectedCategory) {
      return showFullPath || showCheckbox
        ? selectedPath.map((item) => item.name).join(" / ")
        : selectedCategory.name;
    }

    return null;
  }, [selectedPath, appendName, value, rootOptionLabel, categoryMap, showFullPath, showCheckbox]);

  return (
    <div ref={containerRef} className={cn("relative w-full font-sans select-none", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-medium text-foreground bg-input border border-border rounded-xl transition-all cursor-pointer outline-none focus:border-primary/60 hover:bg-secondary/5 duration-200",
          isOpen && "border-primary/70 ring-1 ring-primary/30 shadow-sm",
          disabled && "opacity-50 pointer-events-none cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          <Folder className="w-4 h-4 text-primary shrink-0 opacity-80" />
          {livePathDisplay ? (
            <span className="truncate text-foreground font-semibold">
              {livePathDisplay}
            </span>
          ) : (
            <span className="text-muted-foreground/80 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              onClick={handleClear}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180 text-primary"
            )}
          />
        </div>
      </button>

      {/* Multilevel Cascading Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 top-full mt-2 flex flex-row shadow-2xl rounded-2xl bg-card border border-border/80 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 max-w-[90vw]">
          {columns.map((columnItems, colIndex) => {
            const activeParentId = expandedPath[colIndex];
            const parentCatName = colIndex > 0 ? categoryMap.get(expandedPath[colIndex - 1])?.name : undefined;

            return (
              <div
                key={colIndex}
                className={cn(
                  "w-56 max-h-72 overflow-y-auto py-1.5 flex flex-col shrink-0 custom-scrollbar",
                  colIndex > 0 && "border-l border-border/40 bg-secondary/10"
                )}
              >
                <div
                  className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1 border-b border-border/30 mb-1 truncate"
                  title={parentCatName || "Main Category"}
                >
                  <Layers className="w-3 h-3 text-primary/70 shrink-0" />
                  <span className="truncate">
                    {colIndex === 0 ? "Main Category" : parentCatName || `Sub Level ${colIndex}`}
                  </span>
                </div>

                {/* Root Option in Column 0 if enabled */}
                {colIndex === 0 && showRootOption && (
                  <div
                    onClick={() => handleItemSelect(null)}
                    onMouseEnter={() => handleItemHover(0, "")}
                    className={cn(
                      "group flex items-center justify-between px-3.5 py-2 text-xs transition-colors cursor-pointer select-none mx-1 rounded-lg border-b border-border/20 mb-1",
                      value === null || value === ""
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-secondary/20"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {showCheckbox && (
                        <div
                          className={cn(
                            "w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0",
                            value === null || value === ""
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border bg-card group-hover:border-primary/50"
                          )}
                        >
                          {(value === null || value === "") && (
                            <Check className="w-3 h-3 text-primary-foreground stroke-[2.5]" />
                          )}
                        </div>
                      )}
                      <span className="truncate italic">{rootOptionLabel}</span>
                    </div>
                  </div>
                )}

                {columnItems.map((cat) => {
                  const children = childrenMap.get(cat.id) || [];
                  const hasChildren = children.length > 0;
                  const isExpanded = activeParentId === cat.id;
                  const isSelected = value === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onMouseEnter={() => handleItemHover(colIndex, cat.id)}
                      onClick={() => handleItemSelect(cat.id)}
                      className={cn(
                        "group flex items-center justify-between px-3.5 py-2 text-xs transition-colors cursor-pointer select-none mx-1 rounded-lg",
                        isSelected
                          ? "bg-primary/15 text-primary font-semibold border border-primary/20 shadow-2xs"
                          : isExpanded
                          ? "bg-accent/15 text-accent-foreground font-medium"
                          : "text-foreground hover:bg-secondary/20"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate pr-1">
                        {showCheckbox && (
                          <div
                            className={cn(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border bg-card group-hover:border-primary/50"
                            )}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-primary-foreground stroke-[2.5]" />
                            )}
                          </div>
                        )}
                        <span className="truncate">{cat.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {hasChildren && (
                          <ChevronRight
                            className={cn(
                              "w-3.5 h-3.5 transition-transform",
                              isSelected
                                ? "text-primary font-bold"
                                : isExpanded
                                ? "text-primary translate-x-0.5"
                                : "text-muted-foreground/60 group-hover:text-foreground"
                            )}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
