"use client";

import React, { useState, useEffect } from "react";
import { 
  Ticket, 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  Check, 
  X, 
  AlertCircle, 
  Calendar, 
  UserCheck, 
  Percent, 
  DollarSign, 
  ShieldAlert,
  ArrowRight
} from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isActionId, setIsActionId] = useState<string | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Parse initial query params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const search = params.get("search") || params.get("q") || "";
      if (search) {
        setSearchQuery(search);
      }
    }
  }, []);

  // Create Coupon Modal State
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<"percentage" | "fixed">("percentage");
  const [newValue, setNewValue] = useState<number | "">("");
  const [newMinOrder, setNewMinOrder] = useState<number | "">("");
  const [newMaxDiscount, setNewMaxDiscount] = useState<number | "">("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newUsageLimit, setNewUsageLimit] = useState<number | "">("");
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Coupons on Mount
  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/coupons");
      if (res.ok) {
        setCoupons(await res.json());
      } else {
        console.error("Failed to load coupons");
      }
    } catch (error) {
      console.error("Error loading coupons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    
    // Set default dates for modal to today and next month
    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setNewStartDate(today);
    setNewEndDate(nextMonth);
  }, []);

  // Toggle Coupon Active Status
  const handleToggleStatus = async (couponId: string, currentStatus: boolean) => {
    setIsActionId(couponId);
    try {
      const res = await fetch(`/api/coupons/${couponId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (res.ok) {
        setCoupons(prev =>
          prev.map(c => (c.id === couponId ? { ...c, isActive: !currentStatus } : c))
        );
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    } finally {
      setIsActionId(null);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (couponId: string, couponCode: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete the coupon "${couponCode}"?`);
    if (!confirmed) return;

    setIsActionId(couponId);
    try {
      const res = await fetch(`/api/coupons/${couponId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setCoupons(prev => prev.filter(c => c.id !== couponId));
      } else {
        alert("Failed to delete coupon");
      }
    } catch (error) {
      console.error("Error deleting coupon:", error);
    } finally {
      setIsActionId(null);
    }
  };

  // Submit New Coupon Form
  const handleSubmitCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) {
      setFormError("Coupon code is required.");
      return;
    }
    if (newValue === "" || newValue <= 0) {
      setFormError("Discount value must be greater than zero.");
      return;
    }
    if (newType === "percentage" && newValue > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }
    if (!newStartDate || !newEndDate) {
      setFormError("Validity start and end dates are required.");
      return;
    }
    if (newStartDate > newEndDate) {
      setFormError("Validity start date must be before or equal to the end date.");
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      // Convert UI amounts (INR) to paise for API/Database
      const value = newType === "fixed" ? Math.round(Number(newValue) * 100) : Number(newValue);
      const minOrderAmount = newMinOrder !== "" ? Math.round(Number(newMinOrder) * 100) : null;
      const maxDiscountAmount = newMaxDiscount !== "" ? Math.round(Number(newMaxDiscount) * 100) : null;
      const usageLimit = newUsageLimit !== "" ? Number(newUsageLimit) : null;

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          discountType: newType,
          discountValue: value,
          minOrderAmount,
          maxDiscountAmount,
          startDate: newStartDate,
          endDate: newEndDate,
          usageLimit,
          isActive: true
        })
      });

      if (res.ok) {
        setIsOpenModal(false);
        // Reset form
        setNewCode("");
        setNewType("percentage");
        setNewValue("");
        setNewMinOrder("");
        setNewMaxDiscount("");
        fetchCoupons(); // Refresh list
      } else {
        const errData = await res.json();
        setFormError(errData.error || "Failed to create coupon");
      }
    } catch (error: any) {
      setFormError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper formats
  const formatPrice = (priceInPaise: number | null) => {
    if (priceInPaise === null) return "None";
    return `₹${(priceInPaise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Filtering Logic
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && coupon.isActive) ||
      (statusFilter === "inactive" && !coupon.isActive);

    return matchesSearch && matchesStatus;
  });

  // Metrics summary
  const activeCouponsCount = coupons.filter(c => c.isActive).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.usageCount, 0);
  const avgDiscountValue = coupons.length > 0 
    ? Math.round(coupons.reduce((sum, c) => sum + (c.discountType === "percentage" ? c.discountValue : c.discountValue / 100), 0) / coupons.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl font-normal text-foreground">Discount & Coupon Management</h1>
          <p className="text-xs text-muted-foreground font-light">
            Build promotional discount rules, coupon expiration campaigns, and usage caps.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              setIsOpenModal(true);
              setFormError(null);
            }}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active Campaigns */}
        <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Campaigns</span>
            <Ticket className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : activeCouponsCount}
            </h2>
            <p className="text-[10px] text-muted-foreground font-light">Running promotions in checkout</p>
          </div>
        </div>

        {/* Card 2: Total Redemptions */}
        <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Redemptions</span>
            <UserCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : totalRedemptions}
            </h2>
            <p className="text-[10px] text-muted-foreground font-light">Codes applied successfully to orders</p>
          </div>
        </div>

        {/* Card 3: Avg Discount Rule */}
        <div className="bg-card border border-border/40 p-4 rounded-2xl shadow-sm space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg Promo Rule</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : `~${avgDiscountValue}% / INR`}
            </h2>
            <p className="text-[10px] text-muted-foreground font-light">Average scale of discount campaign rules</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card border border-border/40 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search by Coupon Code (e.g. SAVE20)..."
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
            <option value="all">All Campaigns</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Coupons List Table */}
      <div className="bg-card border border-border/40 rounded-3xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-24 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-xs text-muted-foreground font-light">Loading coupon campaigns...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-24 text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-accent/10 text-accent rounded-full">
              <Ticket className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-semibold tracking-wide">No Coupons Configured</h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                {coupons.length === 0 
                  ? "Build coupon campaigns to drive checkout sales."
                  : "We couldn't find any coupon campaigns matching your search code or status filters."}
              </p>
            </div>
            {coupons.length === 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setIsOpenModal(true)}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-secondary text-secondary-foreground hover:bg-secondary/95 border border-secondary rounded-xl text-xs font-medium transition-all cursor-pointer"
                >
                  Create First Coupon
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-light border-collapse">
              <thead>
                <tr className="bg-secondary/35 border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                  <th className="py-3.5 px-4 w-44">Coupon Code</th>
                  <th className="py-3.5 px-4 text-center w-36">Discount Type & Value</th>
                  <th className="py-3.5 px-4 text-center w-36">Min Order Limit</th>
                  <th className="py-3.5 px-4 text-center w-48">Validity Window</th>
                  <th className="py-3.5 px-4 text-center w-36">Redemptions / Cap</th>
                  <th className="py-3.5 px-4 text-center w-28">Status</th>
                  <th className="py-3.5 px-4 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => {
                  const displayValue = 
                    coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%`
                      : `₹${(coupon.discountValue / 100).toLocaleString()}`;
                      
                  const isExpired = new Date(coupon.endDate) < new Date();
                  const isUpcoming = new Date(coupon.startDate) > new Date();

                  return (
                    <tr 
                      key={coupon.id} 
                      className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all group"
                    >
                      {/* Code */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-foreground text-xs leading-normal bg-secondary/60 border border-border/60 py-1 px-2.5 rounded-lg">
                          {coupon.code}
                        </span>
                      </td>

                      {/* Discount Type and Value */}
                      <td className="py-3 px-4 text-center">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground text-xs leading-normal block">
                            {displayValue}
                          </span>
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wider block font-bold">
                            {coupon.discountType}
                          </span>
                        </div>
                      </td>

                      {/* Min Order Limit */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-xs text-foreground block">
                          {formatPrice(coupon.minOrderAmount)}
                        </span>
                        {coupon.maxDiscountAmount !== null && (
                          <span className="text-[9px] text-muted-foreground block font-light leading-normal">
                            Max Cap: {formatPrice(coupon.maxDiscountAmount)}
                          </span>
                        )}
                      </td>

                      {/* Validity window */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          <span>{formatDate(coupon.startDate)}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
                          <span>{formatDate(coupon.endDate)}</span>
                        </div>
                        {isExpired && (
                          <span className="text-[9px] text-rose-500 font-bold block mt-0.5 uppercase tracking-wide">Expired</span>
                        )}
                        {isUpcoming && (
                          <span className="text-[9px] text-indigo-400 font-bold block mt-0.5 uppercase tracking-wide">Upcoming</span>
                        )}
                      </td>

                      {/* Redemptions count */}
                      <td className="py-3 px-4 text-center">
                        <div className="space-y-0.5 font-mono text-xs">
                          <span className="font-bold text-foreground block">{coupon.usageCount}</span>
                          <span className="text-[10px] text-muted-foreground/55 block font-light">
                            Limit: {coupon.usageLimit !== null ? coupon.usageLimit : "∞"}
                          </span>
                        </div>
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isActionId === coupon.id}
                          onClick={() => handleToggleStatus(coupon.id, coupon.isActive)}
                          className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                            coupon.isActive
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/70"
                          }`}
                        >
                          {isActionId === coupon.id && <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />}
                          {coupon.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <button
                          disabled={isActionId === coupon.id}
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          className="inline-flex items-center justify-center p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 border border-border/40 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                          title="Delete Coupon"
                        >
                          {isActionId === coupon.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
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

      {/* Create Coupon Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center animate-fade-in">
          <div 
            className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-xl overflow-hidden scale-in p-6 space-y-6 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold text-foreground">Create Coupon Rule</h3>
                <p className="text-[10px] text-muted-foreground font-light">
                  Define discount properties, validity constraints, and usage limits.
                </p>
              </div>
              <button 
                onClick={() => setIsOpenModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/15 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitCoupon} className="space-y-4">
              {/* Row 1: Code and Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FESTIVE20"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-mono font-bold transition-all placeholder:text-muted-foreground/35"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Discount Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewType("percentage");
                        setNewValue("");
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        newType === "percentage"
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-secondary/35 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewType("fixed");
                        setNewValue("");
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        newType === "fixed"
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-secondary/35 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Fixed INR
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Discount Value and Min Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {newType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (INR)"}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={newType === "percentage" ? 100 : undefined}
                    placeholder={newType === "percentage" ? "e.g. 15" : "e.g. 250"}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-medium transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Min Order Requirement (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional (e.g. 999)"
                    value={newMinOrder}
                    onChange={(e) => setNewMinOrder(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-medium transition-all"
                  />
                </div>
              </div>

              {/* Row 3: Max Discount (for Percentages) and Usage Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Max Discount Cap (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={newType === "fixed"}
                    placeholder={newType === "fixed" ? "Disabled for Fixed INR" : "Optional (e.g. 500)"}
                    value={newType === "fixed" ? "" : newMaxDiscount}
                    onChange={(e) => setNewMaxDiscount(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-medium transition-all disabled:opacity-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Global Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited if empty"
                    value={newUsageLimit}
                    onChange={(e) => setNewUsageLimit(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-medium transition-all"
                  />
                </div>
              </div>

              {/* Row 4: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Start Validity Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-medium transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    End Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs outline-none text-foreground font-medium transition-all"
                  />
                </div>
              </div>

              {/* Error area */}
              {formError && (
                <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-xs flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-light">{formError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="flex-1 py-3 px-4 bg-transparent hover:bg-secondary/15 border border-border text-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
