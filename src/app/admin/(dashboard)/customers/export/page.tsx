"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Users, 
  Search, 
  X, 
  Loader2, 
  Plus, 
  Trash2, 
  Download, 
  RefreshCw, 
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sliders,
  CheckCircle,
  Columns
} from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { EXPORT_FIELD_REGISTRY, EXPORT_FIELD_MAP } from "@/services/crm/export/customer-export-fields";
import { CustomerFilterGroup, CustomerFilterCondition } from "@/services/crm/export/customer-export.types";

const FILTERABLE_FIELDS = [
  { key: "segment", label: "Customer Segment", type: "segment" },
  { key: "accountStatus", label: "Account Status", type: "enum", options: ["Active", "Banned"] },
  { key: "marketingConsent", label: "Marketing Consent", type: "enum", options: ["Yes", "No"] },
  { key: "totalOrders", label: "Total Orders", type: "number" },
  { key: "completedOrders", label: "Completed Orders", type: "number" },
  { key: "cancelledOrders", label: "Cancelled Orders", type: "number" },
  { key: "lifetimeValue", label: "Lifetime Value (Spent)", type: "number" },
  { key: "averageOrderValue", label: "Average Order Value", type: "number" },
  { key: "wishlistCount", label: "Wishlist Count", type: "number" },
  { key: "recentlyViewedCount", label: "Recently Viewed Count", type: "number" },
  { key: "searchCount", label: "Search Count", type: "number" },
  { key: "createdAt", label: "Created Date", type: "date" },
  { key: "lastLoginAt", label: "Last Login Date", type: "date" },
  { key: "customerTags", label: "Customer Tags", type: "string" },
  { key: "favoriteCategory", label: "Favorite Category", type: "string" },
  { key: "favoriteCollection", label: "Favorite Collection", type: "string" },
  { key: "favoriteShape", label: "Favorite Shape", type: "string" },
  { key: "favoriteLength", label: "Favorite Length", type: "string" }
];

const SEGMENTS_LIST = [
  "VIP Customers",
  "Frequent Buyers",
  "One-Time Buyers",
  "Cart Abandoners",
  "Wishlist Heavy Users",
  "High Lifetime Value",
  "New Customers",
  "Inactive Customers"
];

export default function CustomerExportBuilderPage() {
  const searchParams = useSearchParams();

  // Initial State Preloading from URL query parameters
  const initialMode = (searchParams.get("mode") as "all" | "filtered" | "selected") || "all";
  const initialIds = searchParams.get("ids") ? searchParams.get("ids")!.split(",") : [];

  // Config State
  const [selectionMode, setSelectionMode] = useState<"all" | "filtered" | "selected">(initialMode);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    EXPORT_FIELD_REGISTRY.filter(f => f.enabledByDefault).map(f => f.key)
  );

  // Dynamic Filters State
  const [filterGroup, setFilterGroup] = useState<CustomerFilterGroup>({
    operator: "AND",
    conditions: []
  });

  // Preview State
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // UI Status
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state if URL query parameters change (e.g. from parent redirection)
  useEffect(() => {
    const mode = searchParams.get("mode") as "all" | "filtered" | "selected";
    const ids = searchParams.get("ids") ? searchParams.get("ids")!.split(",") : [];
    if (mode) setSelectionMode(mode);
    if (ids.length > 0) {
      setSelectedIds(ids);
      setSelectionMode("selected");
    }
  }, [searchParams]);

  // Load Preview from Database
  const fetchPreview = async () => {
    if (selectedFields.length === 0) {
      setPreviewRows([]);
      setTotalMatches(0);
      setTotalPages(1);
      return;
    }

    setIsLoadingPreview(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/customers/export/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: selectedFields,
          filters: filterGroup,
          selection: {
            mode: selectionMode,
            selectedIds: selectionMode === "selected" ? selectedIds : undefined
          },
          page: currentPage,
          pageSize,
          sort: {
            field: sortField,
            direction: sortDirection
          },
          search: debouncedSearch || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewRows(data.rows || []);
        setTotalMatches(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        const errorData = await res.json();
        setErrorMessage(errorData.error || "Failed to load customer preview dataset.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Connection error loading preview. Please try again.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Reload preview when dependencies change
  useEffect(() => {
    fetchPreview();
  }, [selectionMode, selectedIds, selectedFields, currentPage, pageSize, sortField, sortDirection, debouncedSearch]);

  // Handle Dynamic Filter builder changes
  const addCondition = () => {
    const defaultField = FILTERABLE_FIELDS[0];
    const newCondition: CustomerFilterCondition = {
      field: defaultField.key,
      operator: "is",
      value: ""
    };
    setFilterGroup(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  };

  const removeCondition = (index: number) => {
    setFilterGroup(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const updateCondition = (index: number, key: keyof CustomerFilterCondition, value: any) => {
    setFilterGroup(prev => {
      const updatedConditions = [...prev.conditions];
      
      // If updating the field, reset operator and value appropriate to the field type
      if (key === "field") {
        const fieldConf = FILTERABLE_FIELDS.find(f => f.key === value);
        let defaultOperator = "is";
        let defaultValue: any = "";

        if (fieldConf?.type === "number") {
          defaultOperator = "greaterThanOrEqual";
        } else if (fieldConf?.type === "date") {
          defaultOperator = "inLastDays";
          defaultValue = "30";
        } else if (fieldConf?.type === "enum") {
          defaultValue = fieldConf.options ? fieldConf.options[0] : "";
        } else if (fieldConf?.type === "segment") {
          defaultValue = SEGMENTS_LIST[0];
        }

        updatedConditions[index] = {
          field: value,
          operator: defaultOperator,
          value: defaultValue
        };
      } else {
        updatedConditions[index] = {
          ...updatedConditions[index],
          [key]: value
        };
      }

      return {
        ...prev,
        conditions: updatedConditions
      };
    });
  };

  const toggleFieldSelection = (fieldKey: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey)
        ? prev.filter(key => key !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleSelectAllFields = () => {
    setSelectedFields(EXPORT_FIELD_REGISTRY.map(f => f.key));
  };

  const handleClearAllFields = () => {
    setSelectedFields([]);
  };

  // Get matching operators lists based on field type
  const getOperatorsForField = (fieldKey: string) => {
    const fieldConf = FILTERABLE_FIELDS.find(f => f.key === fieldKey);
    if (!fieldConf) return [{ value: "is", label: "is" }];

    switch (fieldConf.type) {
      case "segment":
      case "enum":
        return [
          { value: "is", label: "is" },
          { value: "isNot", label: "is not" }
        ];
      case "number":
        return [
          { value: "equals", label: "equals" },
          { value: "notEquals", label: "not equals" },
          { value: "greaterThan", label: "greater than" },
          { value: "greaterThanOrEqual", label: "greater than or equal" },
          { value: "lessThan", label: "less than" },
          { value: "lessThanOrEqual", label: "less than or equal" },
          { value: "between", label: "between" }
        ];
      case "date":
        return [
          { value: "before", label: "before" },
          { value: "after", label: "after" },
          { value: "on", label: "on" },
          { value: "dateBetween", label: "between" },
          { value: "inLastDays", label: "in the last N days" }
        ];
      case "string":
      default:
        return [
          { value: "is", label: "is" },
          { value: "isNot", label: "is not" },
          { value: "contains", label: "contains" },
          { value: "doesNotContain", label: "does not contain" }
        ];
    }
  };

  // Handle actual file generation & secure re-authentication OTP check
  const handleExportSubmit = async () => {
    if (selectedFields.length === 0) {
      setErrorMessage("Please select at least one field column to export.");
      return;
    }
    if (totalMatches === 0) {
      setErrorMessage("No matching customer records found to export.");
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      fields: selectedFields,
      filters: filterGroup,
      selection: {
        mode: selectionMode,
        selectedIds: selectionMode === "selected" ? selectedIds : undefined
      },
      format: "csv"
    };

    try {
      const res = await fetch("/api/admin/customers/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Successful Generation: trigger file download from blob
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        const contentDisposition = res.headers.get("Content-Disposition");
        let filename = `snail-studio-customers-${new Date().toISOString().split("T")[0]}.csv`;
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?([^"]+)"?/);
          if (match) filename = match[1];
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        setSuccessMessage(`Export file '${filename}' generated and downloaded successfully!`);
      } else if (res.status === 403) {
        // Intercepted by Admin Shell OTP validation. Do nothing here, standard fetch wrapper handles it.
      } else {
        const errorData = await res.json();
        setErrorMessage(errorData.error || "Unable to generate file export.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Connection error generating export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Sort toggle handler
  const handleSort = (fieldKey: string) => {
    if (sortField === fieldKey) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(fieldKey);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  // Grouped Fields registry list
  const fieldGroups = EXPORT_FIELD_REGISTRY.reduce((groups: Record<string, typeof EXPORT_FIELD_REGISTRY>, item) => {
    if (!groups[item.group]) {
      groups[item.group] = [];
    }
    groups[item.group].push(item);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="flex items-center gap-4 relative z-10">
          <Link
            prefetch={false}
            href="/admin/customers"
            className="p-2.5 rounded-full border border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="space-y-1 text-left">
            <h1 className="font-serif text-2xl font-normal text-foreground">Export Customers</h1>
            <p className="text-xs text-muted-foreground font-light">
              Build custom segments, select specific database fields, preview matching rows, and securely download records.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 text-xs bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 font-light max-w-7xl mx-auto">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 p-4 text-xs bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 font-light max-w-7xl mx-auto animate-fade-in">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid Builder section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns - Controls */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* 1. Selection & Mode */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">1. Customer Selection</span>
              <h2 className="text-sm font-semibold text-foreground">Specify target dataset</h2>
            </div>

            <div className="space-y-3">
              {[
                { value: "all", label: "All Customers", desc: "Export complete active shopper database", icon: Users },
                { value: "filtered", label: "Filtered Customers", desc: "Apply custom rules and segment filters", icon: Sliders },
                { value: "selected", label: "Selected Customers", desc: selectedIds.length > 0 ? `${selectedIds.length} checked from list` : "Check specific customer rows first", icon: CheckCircle }
              ].map(item => {
                const isActive = selectionMode === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      setSelectionMode(item.value as any);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/30 hover:bg-secondary/15 hover:border-border/60"
                    }`}
                  >
                    <div className={`p-2 rounded-xl border transition-all mt-0.5 ${
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-secondary/50 text-muted-foreground border-border/45"
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground font-light leading-normal">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Fields Registry Selector */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">2. Export Columns</span>
                <h2 className="text-sm font-semibold text-foreground">Select active fields</h2>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">
                {selectedFields.length} selected
              </span>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={handleSelectAllFields}
                className="flex-1 py-2 px-3 rounded-xl border border-border text-[10px] font-semibold text-foreground hover:bg-secondary/30 transition-all cursor-pointer"
              >
                Select All
              </button>
              <button
                onClick={handleClearAllFields}
                className="flex-1 py-2 px-3 rounded-xl border border-border text-[10px] font-semibold text-foreground hover:bg-secondary/30 transition-all cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-5 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar text-left">
              {Object.entries(fieldGroups).map(([groupName, fields]) => (
                <div key={groupName} className="space-y-2.5">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/20 pb-1">
                    {groupName}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {fields.map(field => {
                      const isSelected = selectedFields.includes(field.key);
                      return (
                        <button
                          key={field.key}
                          onClick={() => toggleFieldSelection(field.key)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/70 hover:text-foreground"
                          }`}
                        >
                          {field.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Columns - Filters & Preview */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dynamic Filter Builder */}
          {selectionMode === "filtered" && (
            <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-5 animate-slide-in">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">3. Filter Builder</span>
                  <h2 className="text-sm font-semibold text-foreground">Build dynamic segmentation rules</h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-light">Match mode:</span>
                  <select
                    value={filterGroup.operator}
                    onChange={(e) => setFilterGroup(prev => ({ ...prev, operator: e.target.value as "AND" | "OR" }))}
                    className="bg-secondary/40 border border-border/40 focus:border-primary focus:outline-none rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground cursor-pointer"
                  >
                    <option value="AND">ALL Rules (AND)</option>
                    <option value="OR">ANY Rules (OR)</option>
                  </select>
                </div>
              </div>

              {/* Conditions list */}
              {filterGroup.conditions.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center gap-2 bg-secondary/5">
                  <p className="text-xs text-muted-foreground font-light">No filtering conditions declared yet.</p>
                  <button
                    onClick={addCondition}
                    className="inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Filter Rule
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filterGroup.conditions.map((cond, index) => {
                    const fieldConf = FILTERABLE_FIELDS.find(f => f.key === cond.field);
                    const ops = getOperatorsForField(cond.field);

                    return (
                      <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-2xl bg-secondary/15 border border-border/30">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1 text-left sm:w-12 shrink-0">
                          {index === 0 ? "Where" : filterGroup.operator}
                        </span>
                        
                        {/* Field Dropdown */}
                        <select
                          value={cond.field}
                          onChange={(e) => updateCondition(index, "field", e.target.value)}
                          className="bg-background border border-border/50 focus:border-primary focus:outline-none rounded-xl px-3 py-2 text-xs font-semibold text-foreground cursor-pointer flex-1 sm:max-w-[200px]"
                        >
                          {FILTERABLE_FIELDS.map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>

                        {/* Operator Dropdown */}
                        <select
                          value={cond.operator}
                          onChange={(e) => updateCondition(index, "operator", e.target.value)}
                          className="bg-background border border-border/50 focus:border-primary focus:outline-none rounded-xl px-3 py-2 text-xs font-semibold text-foreground cursor-pointer flex-1 sm:max-w-[180px]"
                        >
                          {ops.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>

                        {/* Value Input */}
                        <div className="flex-1 flex gap-2">
                          {fieldConf?.type === "segment" ? (
                            <select
                              value={cond.value || SEGMENTS_LIST[0]}
                              onChange={(e) => updateCondition(index, "value", e.target.value)}
                              className="w-full bg-background border border-border/50 focus:border-primary focus:outline-none rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer"
                            >
                              {SEGMENTS_LIST.map(seg => (
                                <option key={seg} value={seg}>{seg}</option>
                              ))}
                            </select>
                          ) : fieldConf?.type === "enum" ? (
                            <select
                              value={cond.value || (fieldConf.options ? fieldConf.options[0] : "")}
                              onChange={(e) => updateCondition(index, "value", e.target.value)}
                              className="w-full bg-background border border-border/50 focus:border-primary focus:outline-none rounded-xl px-3 py-2 text-xs text-foreground cursor-pointer"
                            >
                              {fieldConf.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : cond.operator === "between" || cond.operator === "dateBetween" ? (
                            <div className="w-full flex items-center gap-1.5">
                              <input
                                type={fieldConf?.type === "date" ? "date" : "text"}
                                placeholder="Min"
                                value={Array.isArray(cond.value) ? cond.value[0] || "" : ""}
                                onChange={(e) => {
                                  const val2 = Array.isArray(cond.value) ? cond.value[1] || "" : "";
                                  updateCondition(index, "value", [e.target.value, val2]);
                                }}
                                className="w-full bg-background border border-border/50 focus:border-primary focus:outline-none rounded-xl px-3 py-2 text-xs text-foreground"
                              />
                              <span className="text-[10px] text-muted-foreground font-light">to</span>
                              <input
                                type={fieldConf?.type === "date" ? "date" : "text"}
                                placeholder="Max"
                                value={Array.isArray(cond.value) ? cond.value[1] || "" : ""}
                                onChange={(e) => {
                                  const val1 = Array.isArray(cond.value) ? cond.value[0] || "" : "";
                                  updateCondition(index, "value", [val1, e.target.value]);
                                }}
                                className="w-full bg-background border border-border/50 focus:border-primary focus:outline-none rounded-xl px-3 py-2 text-xs text-foreground"
                              />
                            </div>
                          ) : (
                            <input
                              type={fieldConf?.type === "date" ? "date" : "text"}
                              placeholder={fieldConf?.type === "number" ? "Value..." : "Filter text..."}
                              value={cond.value || ""}
                              onChange={(e) => updateCondition(index, "value", e.target.value)}
                              className="w-full bg-background border border-border/50 focus:border-primary focus:outline-none rounded-xl px-3 py-2 text-xs text-foreground font-light"
                            />
                          )}
                        </div>

                        {/* Remove Action */}
                        <button
                          onClick={() => removeCondition(index)}
                          className="p-2 text-muted-foreground hover:text-rose-500 rounded-full hover:bg-secondary/40 transition-all shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="flex justify-start">
                    <button
                      onClick={addCondition}
                      className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-[10px] font-semibold transition-all cursor-pointer border border-border/40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Rule
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Database Table */}
          <div className="bg-card border border-border/40 rounded-3xl overflow-hidden shadow-sm flex flex-col">
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 bg-card/60 border-b border-border/30">
              <div className="space-y-1 text-left">
                <h3 className="text-sm font-semibold text-foreground">Customer Preview</h3>
                <p className="text-[10px] text-muted-foreground font-light">
                  {totalMatches} matching customer{totalMatches !== 1 && "s"} found in target dataset
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="relative max-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search preview..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-secondary/30 border border-border/50 focus:border-primary focus:outline-none rounded-xl text-[10px] font-light text-foreground"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={fetchPreview}
                  disabled={isLoadingPreview}
                  className="p-2 rounded-xl border border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? "animate-spin text-primary" : ""}`} />
                </button>
              </div>
            </div>

            {/* Live Table Area */}
            {isLoadingPreview ? (
              <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background/5">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-xs font-light">Loading customer preview registry...</p>
              </div>
            ) : selectedFields.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center justify-center space-y-3 bg-background/5">
                <Columns className="w-8 h-8 text-amber-500/80" />
                <div className="space-y-1 max-w-xs">
                  <p className="text-xs font-semibold">No Columns Selected</p>
                  <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                    Select one or more export column fields in the left sidebar to render the data preview grid.
                  </p>
                </div>
              </div>
            ) : previewRows.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center justify-center space-y-3 bg-background/5">
                <Users className="w-8 h-8 text-muted-foreground" />
                <div className="space-y-1 max-w-xs">
                  <p className="text-xs font-semibold">No Customers Found</p>
                  <p className="text-[10px] text-muted-foreground font-light leading-relaxed">
                    No customers match your target segment or filter configurations. Try updating the filters.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[380px] custom-scrollbar">
                  <table className="w-full text-left text-xs font-light border-collapse">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider bg-secondary/10 sticky top-0 z-10 backdrop-blur-md">
                        {selectedFields.map(key => {
                          const label = EXPORT_FIELD_MAP.get(key)?.label || key;
                          const isSorted = sortField === key;
                          return (
                            <th 
                              key={key} 
                              onClick={() => handleSort(key)}
                              className="py-3 px-4 font-bold tracking-wider cursor-pointer hover:bg-secondary/25 transition-all select-none whitespace-nowrap"
                            >
                              <div className="flex items-center gap-1">
                                {label}
                                {isSorted && (
                                  <span className="text-[8px] text-primary">
                                    {sortDirection === "desc" ? "▼" : "▲"}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr 
                          key={index}
                          className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all"
                        >
                          {selectedFields.map(key => (
                            <td key={key} className="py-3.5 px-4 font-mono text-[10px] text-foreground max-w-[200px] truncate">
                              {row[key] !== "" ? row[key] : <span className="text-muted-foreground/45 italic">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-background border-t border-border/30">
                  <div className="text-[10px] font-light text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{previewRows.length}</span> of{" "}
                    <span className="font-semibold text-foreground">{totalMatches}</span> matches
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Limit Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-light text-muted-foreground">Rows per page</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-muted text-foreground border border-border text-[10px] rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer font-medium"
                      >
                        {[10, 25, 50, 100].map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    {/* Navigation */}
                    <div className="flex items-center gap-1">
                      <button
                        disabled={currentPage === 1 || isLoadingPreview}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-foreground font-light px-2">
                        Page <span className="font-semibold">{currentPage}</span> of{" "}
                        <span className="font-semibold">{totalPages}</span>
                      </span>
                      <button
                        disabled={currentPage === totalPages || isLoadingPreview}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Export Action Card */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">4. Generate Export</span>
              <h2 className="text-sm font-semibold text-foreground">Confirm data compilation details</h2>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4.5 rounded-2xl bg-secondary/15 border border-border/30 text-left">
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Selection Mode</span>
                <p className="text-xs font-semibold text-foreground capitalize">{selectionMode}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Match Count</span>
                <p className="text-xs font-semibold text-foreground">{totalMatches} customers</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Columns Selected</span>
                <p className="text-xs font-semibold text-foreground">{selectedFields.length} columns</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Format</span>
                <p className="text-xs font-semibold text-foreground">CSV (Unicode Excel-Safe)</p>
              </div>
            </div>

            {/* Generate Trigger */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-border/20 pt-5">
              <div className="flex items-center gap-2 text-muted-foreground font-light text-[10px] text-left">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Sensitive Action: Requires OTP security verification on generate request.</span>
              </div>

              <button
                onClick={handleExportSubmit}
                disabled={isExporting || totalMatches === 0 || selectedFields.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-all text-xs font-semibold uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-md shadow-primary/10"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Verify and Export
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
