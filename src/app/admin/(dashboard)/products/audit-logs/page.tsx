"use client";

import React, { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Calendar, 
  Activity,
  Layers,
  ArrowRight,
  Info
} from "lucide-react";

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Track expanded log IDs
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch products for filtering dropdown
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          setProducts(await res.json());
        }
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  // Fetch audit logs based on selection
  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      try {
        const qParams = new URLSearchParams();
        if (selectedProduct !== "all") {
          qParams.append("productId", selectedProduct);
        }
        
        const res = await fetch(`/api/admin/products/audit-logs?${qParams.toString()}`);
        if (res.ok) {
          setLogs(await res.json());
        }
      } catch (err) {
        console.error("Error loading audit logs:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, [selectedProduct]);

  // Toggle expansion of log changes
  const toggleExpand = (logId: string) => {
    setExpandedLogId(prev => (prev === logId ? null : logId));
  };

  // Human readable format for actions
  const formatAction = (action: string) => {
    if (action === "update_product") return "Updated Product Info";
    if (action === "archive_product") return "Archived Product";
    if (action === "update_variant") return "Updated Variant Parameters";
    return action.replace(/_/g, " ");
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Parse and display changes visually
  const renderChanges = (changesStr: string | null) => {
    if (!changesStr) {
      return <span className="text-muted-foreground italic font-light text-[11px]">No property changes details recorded.</span>;
    }
    
    try {
      const changes = JSON.parse(changesStr);
      
      return (
        <div className="space-y-4 pt-2 text-xs">
          {Object.entries(changes).map(([key, value]: [string, any]) => {
            // 1. Status changes formatting
            if (key === "status") {
              return (
                <div key={key} className="flex items-center gap-2 p-2 bg-secondary/15 rounded-xl border border-border/20">
                  <span className="font-semibold text-muted-foreground w-28">Status:</span>
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold uppercase font-mono">{value.old}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/45" />
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-bold uppercase font-mono">{value.new}</span>
                </div>
              );
            }
            
            // 2. Basic fields formatting
            if (key === "basicInfo") {
              return (
                <div key={key} className="space-y-2 p-3 bg-secondary/10 dark:bg-secondary/5 rounded-xl border border-border/20">
                  <span className="font-semibold text-primary block text-[10px] uppercase tracking-wider">Basic Info Fields:</span>
                  <div className="pl-3 border-l-2 border-border space-y-2">
                    {Object.entries(value).map(([f, diff]: [string, any]) => (
                      <div key={f} className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                        <span className="font-medium text-muted-foreground w-36 capitalize">{f.replace(/([A-Z])/g, ' $1')}:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground/70 line-through text-[11px] font-light max-w-[200px] truncate">{String(diff.old)}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                          <span className="text-foreground font-semibold text-[11px] max-w-[200px] truncate">{String(diff.new)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            
            // 3. SEO changes formatting
            if (key === "seo") {
              return (
                <div key={key} className="space-y-2 p-3 bg-secondary/10 dark:bg-secondary/5 rounded-xl border border-border/20">
                  <span className="font-semibold text-primary block text-[10px] uppercase tracking-wider">SEO Meta & Social:</span>
                  <div className="pl-3 border-l-2 border-border space-y-3">
                    {Object.entries(value.new || {}).map(([f, newVal]: [string, any]) => {
                      const oldVal = value.old?.[f];
                      if (oldVal === newVal) return null;
                      return (
                        <div key={f} className="space-y-1">
                          <span className="font-medium text-muted-foreground capitalize text-[10px] block">{f.replace(/([A-Z])/g, ' $1')}</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="p-2 bg-rose-500/5 text-rose-500 border border-rose-500/10 rounded-xl font-light text-[10px] line-through truncate" title={String(oldVal)}>
                              {String(oldVal || "Empty / None")}
                            </div>
                            <div className="p-2 bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 rounded-xl font-medium text-[10px] truncate" title={String(newVal)}>
                              {String(newVal || "Empty / None")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            
            // 4. Mapped attributes IDs changes
            if (key === "attributes") {
              return (
                <div key={key} className="space-y-2 p-3 bg-secondary/10 dark:bg-secondary/5 rounded-xl border border-border/20">
                  <span className="font-semibold text-primary block text-[10px] uppercase tracking-wider">Linked Attributes Mapping:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-3 border-l-2 border-border text-[10px] font-mono">
                    <div>
                      <span className="text-muted-foreground font-sans block mb-0.5">Previous Value IDs:</span>
                      <pre className="p-1.5 bg-secondary/30 rounded border border-border/30 overflow-x-auto">{JSON.stringify(value.old, null, 2)}</pre>
                    </div>
                    <div>
                      <span className="text-foreground font-sans block mb-0.5">New Value IDs:</span>
                      <pre className="p-1.5 bg-secondary/35 rounded border border-border/40 overflow-x-auto text-emerald-500 dark:text-emerald-400">{JSON.stringify(value.new, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              );
            }

            // 5. Variant specific fields formatting
            if (key === "variantFields") {
              return (
                <div key={key} className="space-y-2 p-3 bg-secondary/10 dark:bg-secondary/5 rounded-xl border border-border/20">
                  <span className="font-semibold text-primary block text-[10px] uppercase tracking-wider">Variant Attributes:</span>
                  <div className="pl-3 border-l-2 border-border space-y-2">
                    {Object.entries(value).map(([f, diff]: [string, any]) => {
                      let oldVal = diff.old;
                      let newVal = diff.new;
                      
                      // Convert prices back to decimal for visual formatting
                      if (f === "price" || f === "compareAtPrice") {
                        oldVal = oldVal ? `₹${oldVal}` : "None";
                        newVal = newVal ? `₹${newVal}` : "None";
                      }
                      
                      return (
                        <div key={f} className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                          <span className="font-medium text-muted-foreground w-36 capitalize">{f}:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground/70 line-through text-[11px] font-light">{String(oldVal)}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                            <span className="text-foreground font-semibold text-[11px]">{String(newVal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // 6. Stock changes formatting
            if (key === "stock") {
              const diffVal = value.new - value.old;
              const isIncrease = diffVal > 0;
              
              return (
                <div key={key} className="flex items-center justify-between p-2 bg-secondary/15 rounded-xl border border-border/20">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground w-28">Inventory Levels:</span>
                    <span className="text-muted-foreground/75 line-through">{value.old} units</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/45" />
                    <span className="text-foreground font-bold">{value.new} units</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                    isIncrease ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  }`}>
                    {isIncrease ? `+${diffVal}` : diffVal} units
                  </span>
                </div>
              );
            }

            // Default JSON print block
            return (
              <div key={key} className="space-y-1">
                <span className="font-semibold text-muted-foreground capitalize block">{key}:</span>
                <pre className="p-2.5 bg-secondary/40 border border-border/40 rounded-xl text-[10px] font-mono overflow-x-auto text-foreground max-h-40">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            );
          })}
        </div>
      );
    } catch {
      return (
        <pre className="p-2.5 bg-secondary/40 border border-border/40 rounded-xl text-[10px] font-mono overflow-x-auto text-foreground">
          {changesStr}
        </pre>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Product Audit Trail</h1>
          <p className="text-xs text-muted-foreground font-light">
            Monitor product edits, variant modifications, inventory adjustments, and catalog status logs.
          </p>
        </div>
        
        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">Filter Product:</span>
          {loadingProducts ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3.5 py-2 bg-card border border-border text-foreground rounded-xl text-xs font-semibold outline-none focus:border-primary cursor-pointer hover:bg-secondary/40 transition-colors"
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Logs Area */}
      <div className="bg-card border border-border/40 rounded-3xl shadow-sm overflow-hidden p-6">
        {isLoading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-xs text-muted-foreground font-light">Retrieving audit history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <History className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h3 className="text-sm font-semibold tracking-wide">No Logs Found</h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                We couldn't locate any product edit logs. Try updating product properties to verify.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              
              return (
                <div 
                  key={log.id} 
                  className={`border border-border/40 rounded-2xl overflow-hidden hover:border-primary/20 transition-all ${
                    isExpanded ? "bg-secondary/10 dark:bg-secondary/5 border-primary/20 shadow-sm" : "bg-card"
                  }`}
                >
                  {/* Top Bar Summary Header */}
                  <div 
                    onClick={() => toggleExpand(log.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary group-hover:scale-105 transition-all">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-xs text-foreground block uppercase tracking-wide">
                          {formatAction(log.action)}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground font-light">
                          <span className="font-medium text-foreground">
                            {log.entityType === "product" ? "Product ID" : "Variant ID"}:
                          </span>
                          <span className="font-mono text-[9px] bg-transparent border border-border px-1.5 py-0.5 rounded text-foreground">{log.entityId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="flex flex-col sm:items-end space-y-0.5 text-right">
                        {/* User Email Info */}
                        <div className="flex items-center gap-1.5 text-[10px] text-foreground font-medium sm:justify-end">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{log.user?.name || log.user?.email || "System User"}</span>
                        </div>
                        {/* Date info */}
                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-light sm:justify-end">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(log.createdAt)}</span>
                        </div>
                      </div>
                      
                      {/* Chevron Toggle */}
                      <div className="text-muted-foreground group-hover:text-foreground p-1.5 bg-secondary/10 group-hover:bg-secondary/20 rounded-lg transition-all shrink-0 border border-secondary/10">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-border/30 bg-card/65 animate-slide-down">
                      {/* Meta Information details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-secondary/20 dark:bg-secondary/10 rounded-2xl text-[10px] text-muted-foreground border border-border/20 mb-4">
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[8px] text-muted-foreground/75">Logged IP Address</span>
                          <span className="font-mono text-foreground font-medium">{log.ipAddress || "Unknown"}</span>
                        </div>
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[8px] text-muted-foreground/75">User Email Address</span>
                          <span className="text-foreground font-medium">{log.user?.email || "N/A"}</span>
                        </div>
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[8px] text-muted-foreground/75">Action Identifier</span>
                          <span className="font-mono text-foreground font-medium">{log.action}</span>
                        </div>
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[8px] text-muted-foreground/75">Entity Log Type</span>
                          <span className="font-mono text-foreground font-medium uppercase">{log.entityType}</span>
                        </div>
                      </div>

                      {/* Display change comparison */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" /> Property Modifications Comparison
                        </span>
                        {renderChanges(log.changes)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
