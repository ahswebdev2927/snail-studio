"use client";

import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { AdminReturnRequestCard, ReturnRequestItem } from "@/components/admin/returns/admin-return-request-card";

export default function AdminReturnsPage() {
  const [returnRequests, setReturnRequests] = useState<ReturnRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Metrics computation from state
  const pendingCount = returnRequests.filter((r) => r.status === "PENDING_REVIEW").length;
  const approvedCount = returnRequests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = returnRequests.filter((r) => r.status === "REJECTED").length;
  const replacementCount = returnRequests.filter((r) => r.type === "REPLACEMENT").length;

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, statusFilter, typeFilter]);

  useEffect(() => {
    loadReturnRequests();
  }, [debouncedQuery, statusFilter, typeFilter, currentPage, limit]);

  const loadReturnRequests = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (debouncedQuery.trim()) query.set("search", debouncedQuery.trim());
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (typeFilter !== "all") query.set("type", typeFilter);

      query.set("page", String(currentPage));
      query.set("limit", String(limit));

      const res = await fetch(`/api/admin/returns?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReturnRequests(data.returnRequests || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error("Error loading return requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all">
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground flex items-center space-x-3">
            <span>Return & Replacement Approvals</span>
          </h1>
          <p className="text-xs text-muted-foreground font-light">
            Review customer return and replacement requests, assign operational payment responsibility, and process decisions.
          </p>
        </div>
      </div>

      {/* Metrics Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("PENDING_REVIEW")}
          className="bg-card border border-border/40 hover:border-amber-500/40 rounded-3xl p-5 shadow-sm flex items-center justify-between cursor-pointer transition"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Review</span>
            <p className="font-serif text-xl font-semibold text-amber-500">{pendingCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("APPROVED")}
          className="bg-card border border-border/40 hover:border-emerald-500/40 rounded-3xl p-5 shadow-sm flex items-center justify-between cursor-pointer transition"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Approved</span>
            <p className="font-serif text-xl font-semibold text-emerald-400">{approvedCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("REJECTED")}
          className="bg-card border border-border/40 hover:border-rose-500/40 rounded-3xl p-5 shadow-sm flex items-center justify-between cursor-pointer transition"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rejected</span>
            <p className="font-serif text-xl font-semibold text-rose-400">{rejectedCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setTypeFilter("REPLACEMENT")}
          className="bg-card border border-border/40 hover:border-indigo-500/40 rounded-3xl p-5 shadow-sm flex items-center justify-between cursor-pointer transition"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Replacements</span>
            <p className="font-serif text-xl font-semibold text-indigo-400">{replacementCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3 bg-card border border-border/30 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Order ID, Customer Name, Phone, or Waybill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-border/50 focus:border-primary focus:outline-none rounded-xl text-xs font-light text-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center space-x-1.5 w-full md:w-auto">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer ${
                typeFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/40 text-muted-foreground border border-border/35 hover:bg-secondary/70"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter("RETURN")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer ${
                typeFilter === "RETURN"
                  ? "bg-rose-600 text-white"
                  : "bg-secondary/40 text-muted-foreground border border-border/35 hover:bg-secondary/70"
              }`}
            >
              Returns
            </button>
            <button
              onClick={() => setTypeFilter("REPLACEMENT")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer ${
                typeFilter === "REPLACEMENT"
                  ? "bg-indigo-600 text-white"
                  : "bg-secondary/40 text-muted-foreground border border-border/35 hover:bg-secondary/70"
              }`}
            >
              Replacements
            </button>
          </div>
        </div>

        {/* Secondary Status Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/20 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-secondary/30 border border-border/50 text-foreground rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {(statusFilter !== "all" || typeFilter !== "all" || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
                setSearchQuery("");
              }}
              className="text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Request Grid / List */}
      {isLoading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs font-light">Retrieving return request records...</p>
        </div>
      ) : returnRequests.length === 0 ? (
        <div className="py-24 bg-card border border-border/40 rounded-3xl text-center flex flex-col items-center justify-center space-y-3">
          <RotateCcw className="w-10 h-10 text-muted-foreground/50" />
          <div className="space-y-1 max-w-xs">
            <h3 className="text-sm font-semibold tracking-wide">No Return Requests Found</h3>
            <p className="text-xs text-muted-foreground font-light">
              No return or replacement requests match your active search parameters or filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Pagination Bar */}
          {(totalPages > 1 || totalItems > 0) && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3.5 bg-card border border-border/40 rounded-2xl">
              <div className="text-xs font-light text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{returnRequests.length}</span> of{" "}
                <span className="font-semibold text-foreground">{totalItems}</span> requests
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-light text-muted-foreground">Show</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-muted text-foreground border border-border text-xs rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer font-medium"
                  >
                    {[25, 50, 75, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-foreground font-light px-2.5">
                    Page <span className="font-semibold">{currentPage}</span> of{" "}
                    <span className="font-semibold">{totalPages}</span>
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {returnRequests.map((req) => (
              <AdminReturnRequestCard
                key={req.id}
                request={req}
                onRefresh={loadReturnRequests}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
