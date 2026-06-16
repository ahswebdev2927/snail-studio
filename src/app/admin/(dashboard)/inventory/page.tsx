"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Boxes, 
  History, 
  Search, 
  Plus, 
  Minus, 
  Check, 
  X, 
  Loader2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sliders, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react";

interface InventoryItem {
  id: string;
  variantId: string;
  stockLevel: number;
  lowStockThreshold: number;
  updatedAt: string;
  sku: string;
  variantName: string;
  barcode: string | null;
  productName: string;
  productSlug: string;
  productId: string;
  reservedQuantity: number;
  availableStock: number;
  status: "in-stock" | "low-stock" | "out-of-stock";
}

interface TransactionLog {
  id: string;
  inventoryItemId: string;
  type: "inbound" | "outbound" | "adjustment";
  quantity: number;
  reference: string | null;
  createdAt: string;
  sku: string;
  variantName: string;
  productName: string;
}

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "logs">("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Data lists
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  
  // Inline threshold edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingThreshold, setEditingThreshold] = useState<number>(0);
  
  // Adjustment modal state
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<"inbound" | "outbound" | "adjustment">("inbound");
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustRef, setAdjustRef] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Fetch Inventory Stock Levels
  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (searchQuery.trim()) qParams.append("q", searchQuery.trim());
      if (statusFilter !== "all") qParams.append("status", statusFilter);

      const res = await fetch(`/api/inventory?${qParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data);
      } else {
        console.error("Failed to load inventory data");
      }
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // Fetch Adjustment Logs
  const fetchLogs = useCallback(async () => {
    setIsLogsLoading(true);
    try {
      const res = await fetch("/api/inventory/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        console.error("Failed to load inventory logs");
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setIsLogsLoading(false);
    }
  }, []);

  // Sync data fetch on filters or tab changes
  useEffect(() => {
    if (activeTab === "stock") {
      fetchInventory();
    } else {
      fetchLogs();
    }
  }, [activeTab, fetchInventory, fetchLogs]);

  // Handle Threshold updates
  const handleSaveThreshold = async (itemId: string) => {
    if (editingThreshold < 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: itemId,
          lowStockThreshold: editingThreshold,
        }),
      });
      if (res.ok) {
        // Refresh local items
        setInventoryItems(prev =>
          prev.map(item =>
            item.id === itemId
              ? { 
                  ...item, 
                  lowStockThreshold: editingThreshold, 
                  status: item.availableStock === 0 
                    ? "out-of-stock" 
                    : item.availableStock <= editingThreshold 
                      ? "low-stock" 
                      : "in-stock"
                }
              : item
          )
        );
        setEditingId(null);
      } else {
        alert("Failed to save threshold");
      }
    } catch (error) {
      console.error("Error updating threshold:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle stock adjustments
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    if (adjustQty <= 0 && adjustType !== "adjustment") {
      setAdjustError("Quantity must be greater than zero.");
      return;
    }
    if (adjustQty === 0 && adjustType === "adjustment") {
      setAdjustError("Quantity adjustment offset cannot be zero.");
      return;
    }

    setAdjustError(null);
    setIsSaving(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: adjustingItem.id,
          type: adjustType,
          quantity: adjustQty,
          reference: adjustRef.trim() || null,
        }),
      });

      if (res.ok) {
        setAdjustingItem(null);
        setAdjustQty(1);
        setAdjustRef("");
        fetchInventory(); // Refresh list
      } else {
        const errData = await res.json();
        setAdjustError(errData.error || "Failed to save stock adjustment");
      }
    } catch (error: any) {
      setAdjustError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics summary
  const totalVariantsCount = inventoryItems.length;
  const lowStockCount = inventoryItems.filter(i => i.status === "low-stock").length;
  const outOfStockCount = inventoryItems.filter(i => i.status === "out-of-stock").length;
  const activeReservationsCount = inventoryItems.reduce((sum, item) => sum + item.reservedQuantity, 0);

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Inventory Control Center</h1>
          <p className="text-xs text-muted-foreground font-light">
            Audit catalog warehouse stocks, view holds, and apply manual physical corrections.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab("stock")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === "stock"
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-secondary hover:bg-muted border-border text-foreground"
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Stock Sheets
          </button>
          <button 
            onClick={() => setActiveTab("logs")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
              activeTab === "logs"
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-secondary hover:bg-muted border-border text-foreground"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Logs
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {activeTab === "stock" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total SKUs */}
          <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unique SKUs</span>
              <Boxes className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : totalVariantsCount}
              </h2>
              <p className="text-[10px] text-muted-foreground font-light">Registered variants in catalog</p>
            </div>
          </div>

          {/* Card 2: Low Stock Warning */}
          <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Low Stock alerts</span>
              <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? "text-amber-500 animate-pulse" : "text-muted-foreground"}`} />
            </div>
            <div className="space-y-0.5">
              <h2 className={`text-2xl font-semibold tracking-tight ${lowStockCount > 0 ? "text-amber-500 font-bold" : "text-foreground"}`}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : lowStockCount}
              </h2>
              <p className="text-[10px] text-muted-foreground font-light">At or below stock thresholds</p>
            </div>
          </div>

          {/* Card 3: Out of Stock */}
          <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Out of Stock</span>
              <AlertCircle className={`w-4 h-4 ${outOfStockCount > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
            </div>
            <div className="space-y-0.5">
              <h2 className={`text-2xl font-semibold tracking-tight ${outOfStockCount > 0 ? "text-rose-500 font-bold" : "text-foreground"}`}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : outOfStockCount}
              </h2>
              <p className="text-[10px] text-muted-foreground font-light">Completely empty physical stock</p>
            </div>
          </div>

          {/* Card 4: Reservations */}
          <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reserved stock</span>
              <Info className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : activeReservationsCount}
              </h2>
              <p className="text-[10px] text-muted-foreground font-light">Holds in active customer carts</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stock Sheet View */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border/40 rounded-2xl shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search by Product Name, SKU, Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-border rounded-xl text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/35 font-medium transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-card border border-border text-foreground rounded-xl text-xs font-semibold outline-none focus:border-primary cursor-pointer hover:bg-secondary/40 transition-colors"
              >
                <option value="all" className="bg-card">All Statuses</option>
                <option value="in-stock" className="bg-card text-emerald-500">In Stock</option>
                <option value="low-stock" className="bg-card text-amber-500">Low Stock</option>
                <option value="out-of-stock" className="bg-card text-rose-500">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-24 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <p className="text-xs text-muted-foreground font-light">Loading catalog stock sheets...</p>
              </div>
            ) : inventoryItems.length === 0 ? (
              <div className="p-24 text-center flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-secondary/50 rounded-full text-muted-foreground">
                  <Boxes className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-medium">No Inventory Items Found</h3>
                <p className="text-xs text-muted-foreground font-light max-w-xs leading-relaxed">
                  We couldn't find any variants matching the search query or selected stock filter criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-light border-collapse">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                      <th className="py-3.5 px-4 min-w-[200px]">Product / Variant</th>
                      <th className="py-3.5 px-4 w-40">SKU / Barcode</th>
                      <th className="py-3.5 px-4 text-center w-28">Physical Stock</th>
                      <th className="py-3.5 px-4 text-center w-24">Reservations</th>
                      <th className="py-3.5 px-4 text-center w-28">Available Stock</th>
                      <th className="py-3.5 px-4 text-center w-32">Alert Threshold</th>
                      <th className="py-3.5 px-4 text-center w-28">Status</th>
                      <th className="py-3.5 px-4 text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.map((item) => {
                      const isEditingThreshold = editingId === item.id;
                      
                      return (
                        <tr 
                          key={item.id} 
                          className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all group"
                        >
                          {/* Product details */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-foreground text-xs leading-normal block">
                                {item.productName}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-light block">
                                {item.variantName}
                              </span>
                            </div>
                          </td>

                          {/* SKU and Barcode */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5 font-mono text-[10px]">
                              <span className="font-bold text-foreground block">{item.sku}</span>
                              {item.barcode ? (
                                <span className="text-muted-foreground/60 block">{item.barcode}</span>
                              ) : (
                                <span className="text-muted-foreground/20 italic block">No Barcode</span>
                              )}
                            </div>
                          </td>

                          {/* Physical Stock */}
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-medium text-xs text-foreground">
                              {item.stockLevel}
                            </span>
                          </td>

                          {/* Holds / Reservations */}
                          <td className="py-3 px-4 text-center">
                            <span className={`font-mono text-xs ${item.reservedQuantity > 0 ? "text-indigo-400 font-bold" : "text-muted-foreground/45"}`}>
                              {item.reservedQuantity}
                            </span>
                          </td>

                          {/* Calculated Available Stock */}
                          <td className="py-3 px-4 text-center">
                            <span className={`font-mono font-bold text-xs ${
                              item.availableStock === 0 
                                ? "text-rose-500" 
                                : item.availableStock <= item.lowStockThreshold 
                                  ? "text-amber-500" 
                                  : "text-foreground"
                            }`}>
                              {item.availableStock}
                            </span>
                          </td>

                          {/* Low Stock Alert Threshold */}
                          <td className="py-3 px-4 text-center">
                            {isEditingThreshold ? (
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={editingThreshold}
                                  onChange={(e) => setEditingThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-14 px-2 py-0.5 bg-secondary/80 border border-border focus:border-primary focus:ring-0.5 rounded text-xs text-center text-foreground outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveThreshold(item.id)}
                                  disabled={isSaving}
                                  className="p-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded hover:bg-emerald-500/20 cursor-pointer disabled:opacity-50"
                                >
                                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded hover:bg-rose-500/20 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="group/threshold flex items-center justify-center gap-1.5">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {item.lowStockThreshold}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditingThreshold(item.lowStockThreshold);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 group-hover/threshold:opacity-100 px-1.5 py-0.5 bg-secondary/80 border border-border text-[9px] font-medium text-foreground hover:bg-muted rounded transition-all cursor-pointer"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${
                              item.status === "out-of-stock"
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                : item.status === "low-stock"
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            }`}>
                              {item.status === "out-of-stock" 
                                ? "Out of Stock" 
                                : item.status === "low-stock" 
                                  ? "Low Stock" 
                                  : "In Stock"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setAdjustingItem(item);
                                setAdjustType("inbound");
                                setAdjustQty(1);
                                setAdjustRef("");
                                setAdjustError(null);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/10 hover:bg-accent hover:text-accent-foreground text-accent border border-accent/20 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              <Sliders className="w-3 h-3" />
                              Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Adjustment Audit Logs View */}
      {activeTab === "logs" && (
        <div className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-secondary/20 border-b border-border/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Recent Warehouse Adjustments Ledger
            </span>
          </div>

          {isLogsLoading ? (
            <div className="p-24 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-xs text-muted-foreground font-light">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-24 text-center flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-secondary/50 rounded-full text-muted-foreground">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium">No Audit Logs Found</h3>
              <p className="text-xs text-muted-foreground font-light max-w-xs leading-relaxed">
                There are no recorded physical warehouse stock logs in the database.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light border-collapse">
                <thead>
                  <tr className="bg-secondary/35 border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                    <th className="py-3.5 px-4 w-44">Date / Time</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Product / Variant Details</th>
                    <th className="py-3.5 px-4 w-36">SKU</th>
                    <th className="py-3.5 px-4 text-center w-28">Log Type</th>
                    <th className="py-3.5 px-4 text-center w-28">Quantity Delta</th>
                    <th className="py-3.5 px-4 px-4 min-w-[150px]">Reference / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const formattedDate = new Date(log.createdAt).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    });

                    let typeBadge = "";
                    let deltaText = "";
                    let directionIcon = null;

                    if (log.type === "inbound") {
                      typeBadge = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                      deltaText = `+${log.quantity}`;
                      directionIcon = <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
                    } else if (log.type === "outbound") {
                      typeBadge = "bg-rose-500/10 text-rose-500 border-rose-500/20";
                      deltaText = `-${log.quantity}`;
                      directionIcon = <TrendingDown className="w-3.5 h-3.5 text-rose-500" />;
                    } else {
                      typeBadge = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                      deltaText = log.quantity >= 0 ? `+${log.quantity}` : `${log.quantity}`;
                      directionIcon = log.quantity >= 0 
                        ? <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                        : <TrendingDown className="w-3.5 h-3.5 text-amber-500" />;
                    }

                    return (
                      <tr 
                        key={log.id} 
                        className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all"
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 font-mono text-[10px] text-muted-foreground">
                          {formattedDate}
                        </td>

                        {/* Product / Variant name */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground text-xs leading-normal block">
                              {log.productName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-light block">
                              {log.variantName}
                            </span>
                          </div>
                        </td>

                        {/* Variant SKU */}
                        <td className="py-3.5 px-4 font-mono font-bold text-[10px] text-foreground">
                          {log.sku}
                        </td>

                        {/* Log Type */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${typeBadge}`}>
                            {directionIcon}
                            {log.type}
                          </span>
                        </td>

                        {/* Delta Quantity */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-mono font-bold text-xs ${
                            log.type === "inbound" 
                              ? "text-emerald-500" 
                              : log.type === "outbound" 
                                ? "text-rose-500" 
                                : log.quantity >= 0 
                                  ? "text-emerald-500" 
                                  : "text-rose-500"
                          }`}>
                            {deltaText}
                          </span>
                        </td>

                        {/* Reference Reason */}
                        <td className="py-3.5 px-4 text-muted-foreground text-xs italic font-light">
                          {log.reference || <span className="text-muted-foreground/30">No reference provided</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adjust Stock Modal Dialog */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl overflow-hidden scale-in p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-foreground">Adjust Physical Inventory</h3>
                <p className="text-[10px] text-muted-foreground font-light">
                  SKU: <span className="font-mono font-semibold text-foreground">{adjustingItem.sku}</span>
                </p>
              </div>
              <button 
                onClick={() => setAdjustingItem(null)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item Quick details */}
            <div className="p-3.5 bg-secondary/20 border border-border/40 rounded-2xl flex justify-between items-center text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Target Design</span>
                <span className="font-semibold text-foreground block">{adjustingItem.productName}</span>
                <span className="text-muted-foreground block font-light">{adjustingItem.variantName}</span>
              </div>
              <div className="text-right space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Available Stock</span>
                <span className="font-mono text-sm font-bold text-foreground block">{adjustingItem.availableStock}</span>
                <span className="text-[10px] text-muted-foreground block font-light">(Physical: {adjustingItem.stockLevel})</span>
              </div>
            </div>

            {/* Adjust Form */}
            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              {/* Type Select */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType("inbound");
                      setAdjustQty(1);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      adjustType === "inbound"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 ring-1 ring-emerald-500/20"
                        : "bg-secondary/35 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Inbound (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType("outbound");
                      setAdjustQty(1);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      adjustType === "outbound"
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/30 ring-1 ring-rose-500/20"
                        : "bg-secondary/35 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    Outbound (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType("adjustment");
                      setAdjustQty(0); // Offset delta: defaults to 0 offset recount
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      adjustType === "adjustment"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30 ring-1 ring-amber-500/20"
                        : "bg-secondary/35 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    Recount (±)
                  </button>
                </div>
              </div>

              {/* Quantity input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {adjustType === "inbound" 
                      ? "Quantity to Add" 
                      : adjustType === "outbound" 
                        ? "Quantity to Deduct" 
                        : "Recount Offset Delta (+ / -)"}
                  </label>
                  {adjustType === "outbound" && (
                    <span className="text-[10px] text-muted-foreground font-light">
                      Max deduct: {adjustingItem.stockLevel}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder={adjustType === "adjustment" ? "e.g. +3 or -5" : "e.g. 10"}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-medium transition-all"
                />
                <span className="text-[9px] text-muted-foreground font-light block leading-normal">
                  {adjustType === "inbound" && `Physical stock will increase from ${adjustingItem.stockLevel} to ${adjustingItem.stockLevel + adjustQty}`}
                  {adjustType === "outbound" && `Physical stock will decrease from ${adjustingItem.stockLevel} to ${Math.max(0, adjustingItem.stockLevel - adjustQty)}`}
                  {adjustType === "adjustment" && `Physical stock will change from ${adjustingItem.stockLevel} to ${Math.max(0, adjustingItem.stockLevel + adjustQty)}`}
                </span>
              </div>

              {/* Reference label input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Reference Reason / Log Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inbound shipment arrival, stock audit recount, spoiled item removal"
                  value={adjustRef}
                  onChange={(e) => setAdjustRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-medium transition-all placeholder:text-muted-foreground/35"
                />
              </div>

              {/* Error log */}
              {adjustError && (
                <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-xs flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-light">{adjustError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="flex-1 py-3 px-4 bg-secondary hover:bg-muted border border-border text-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
