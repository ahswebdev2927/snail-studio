"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Search,
  Filter,
  X,
  Loader2,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Eye,
  Printer,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { ServiceabilityCheckerModal } from "@/components/admin/shipments/serviceability-checker-modal";
import { SchedulePickupModal } from "@/components/admin/shipments/schedule-pickup-modal";
import { ShipmentDetailDrawer } from "@/components/admin/shipments/shipment-detail-drawer";
import { ShipmentDispatchModal } from "@/components/admin/orders/shipment-dispatch-modal";

interface ShipmentItem {
  id: string;
  orderId: string;
  carrier: string;
  provider: "delhivery" | "external";
  courierOrderId: string;
  attemptNumber: number;
  waybill: string | null;
  trackingNumber: string;
  trackingUrl: string | null;
  status: string;
  serviceabilityStatus: string | null;
  isExternal: boolean;
  externalCourierName: string | null;
  shippedAt: string | null;
  estimatedDeliveryAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  orderStatus: string;
  orderTotalAmountPaise: number;
  customerName: string;
  customerPhone: string;
  destinationCity: string;
  destinationState: string;
  destinationPincode: string;
}

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [isExternalFilter, setIsExternalFilter] = useState<string>("all");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal / Drawer State
  const [serviceabilityModalOpen, setServiceabilityModalOpen] = useState(false);
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  // Multi-Selection State for Batch Pickup Scheduling
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);

  // Dispatch Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchOrderId, setDispatchOrderId] = useState<string | null>(null);

  // Live Exception Metrics State
  const [exceptionMetrics, setExceptionMetrics] = useState({ ndrCount: 0, pickupCount: 0, rtoCount: 0 });

  useEffect(() => {
    fetchExceptionMetrics();
  }, []);

  const fetchExceptionMetrics = async () => {
    try {
      const res = await fetch("/api/admin/shipping/exceptions");
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          setExceptionMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error("Error loading exception metrics:", err);
    }
  };


  // Ready to pickup shipments eligible for batch pickup
  const readyToPickupShipments = shipments.filter(
    (s) => (s.status === "ready_to_pickup" || s.status === "manifested") && s.provider === "delhivery"
  );

  const isAllReadySelected =
    readyToPickupShipments.length > 0 &&
    readyToPickupShipments.every((s) => selectedShipmentIds.includes(s.id));

  const toggleSelectAllReady = () => {
    if (isAllReadySelected) {
      setSelectedShipmentIds([]);
    } else {
      setSelectedShipmentIds(readyToPickupShipments.map((s) => s.id));
    }
  };

  const toggleSelectShipment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedShipmentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Read URL query params (e.g. from Order Details redirect) on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) {
        setSearchQuery(q);
      }
    }
  }, []);

  // Reset page when queries change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedQuery,
    statusFilter,
    providerFilter,
    isExternalFilter,
    pincodeFilter,
    startDateFilter,
    endDateFilter,
  ]);

  useEffect(() => {
    loadShipments();
  }, [
    debouncedQuery,
    statusFilter,
    providerFilter,
    isExternalFilter,
    pincodeFilter,
    startDateFilter,
    endDateFilter,
    currentPage,
    limit,
  ]);

  const loadShipments = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (debouncedQuery.trim()) query.set("q", debouncedQuery.trim());
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (providerFilter !== "all") query.set("provider", providerFilter);
      if (isExternalFilter !== "all") query.set("isExternal", isExternalFilter);
      if (pincodeFilter.trim()) query.set("pincode", pincodeFilter.trim());
      if (startDateFilter) query.set("startDate", startDateFilter);
      if (endDateFilter) query.set("endDate", endDateFilter);

      query.set("page", String(currentPage));
      query.set("limit", String(limit));

      const res = await fetch(`/api/admin/shipments?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setShipments(data.shipments || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.totalItems || 0);
        }
      }
    } catch (err) {
      console.error("Error loading shipments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = (id: string) => {
    setSelectedShipmentId(id);
    setDetailDrawerOpen(true);
  };

  const printLabel = async (orderId: string, size: "4R" | "A4" = "4R") => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/label?pdfSize=${size}`);
      const labelData = await res.json();
      if (!res.ok || !labelData.success || !labelData.pdfUrl) {
        alert(labelData.error || "Failed to generate label PDF");
        return;
      }
      window.open(labelData.pdfUrl, "_blank");
    } catch (err: any) {
      alert(err.message || "Error printing label");
    }
  };

  // Metrics computation based on loaded list
  const activeCount = shipments.filter((s) => s.status !== "cancelled").length;
  const inTransitCount = shipments.filter((s) => s.status === "in_transit" || s.status === "out_for_delivery").length;
  const ndrCount = shipments.filter((s) => s.status === "ndr").length;
  const deliveredCount = shipments.filter((s) => s.status === "delivered").length;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all">
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground flex items-center space-x-3">
            <span>Shipment Operations</span>
          </h1>
          <p className="text-xs text-muted-foreground font-light">
            Monitor provider-agnostic dispatch attempts, schedule warehouse pickups, issue labels, and manage courier events.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setServiceabilityModalOpen(true)}
            className="px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl text-xs font-medium transition flex items-center space-x-2 border border-border/40 cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-pink-400" />
            <span>Check Pincode</span>
          </button>

          <button
            onClick={() => setPickupModalOpen(true)}
            className="px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-semibold shadow-sm transition flex items-center space-x-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Pickup</span>
          </button>
        </div>
      </div>

      {/* Metrics Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Shipments</span>
            <p className="font-serif text-xl font-semibold text-foreground">{activeCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">In Transit / OFD</span>
            <p className="font-serif text-xl font-semibold text-foreground">{inTransitCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("ndr")}
          className="bg-card border border-border/40 hover:border-amber-500/40 rounded-3xl p-5 shadow-sm flex items-center justify-between cursor-pointer transition"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">NDR Delivery Alerts</span>
            <p className="font-serif text-xl font-semibold text-amber-500">
              {Math.max(ndrCount, exceptionMetrics.ndrCount)}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("rto")}
          className="bg-card border border-border/40 hover:border-red-500/40 rounded-3xl p-5 shadow-sm flex items-center justify-between cursor-pointer transition"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">RTO Exception Journey</span>
            <p className="font-serif text-xl font-semibold text-red-500">{exceptionMetrics.rtoCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-red-500/10 text-red-400">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Search & Comprehensive Multi-Filter Bar */}
      <div className="space-y-3 bg-card border border-border/30 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search AWB, Order ID, Courier ID or Customer..."
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

          {/* Provider Filter Tabs */}
          <div className="flex items-center space-x-1.5 w-full md:w-auto">
            <button
              onClick={() => setProviderFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer ${
                providerFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/40 text-muted-foreground border border-border/35 hover:bg-secondary/70"
              }`}
            >
              All Providers
            </button>
            <button
              onClick={() => setProviderFilter("delhivery")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer ${
                providerFilter === "delhivery"
                  ? "bg-[#a95423] text-white"
                  : "bg-secondary/40 text-muted-foreground border border-border/35 hover:bg-secondary/70"
              }`}
            >
              Delhivery API
            </button>
            <button
              onClick={() => setProviderFilter("external")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition cursor-pointer ${
                providerFilter === "external"
                  ? "bg-amber-600 text-white"
                  : "bg-secondary/40 text-muted-foreground border border-border/35 hover:bg-secondary/70"
              }`}
            >
              External Courier
            </button>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/20 text-xs">
          {/* Status Select */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-secondary/30 border border-border/50 text-foreground rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="ready_to_ship">Ready to Ship</option>
              <option value="pickup_scheduled">Pickup Scheduled</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="ndr">NDR Alert</option>
              <option value="rto">Return to Origin (RTO)</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Pincode Input Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pincode:</span>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 500019"
              value={pincodeFilter}
              onChange={(e) => setPincodeFilter(e.target.value.replace(/\D/g, ""))}
              className="w-24 bg-secondary/30 border border-border/50 text-foreground rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date Range:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="bg-secondary/30 border border-border/50 text-foreground rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="bg-secondary/30 border border-border/50 text-foreground rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar for Batch Pickup */}
      {selectedShipmentIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#a95423]/10 border border-[#a95423]/25 rounded-2xl animate-in fade-in duration-200">
          <div className="flex items-center space-x-3 text-xs">
            <span className="px-2.5 py-1 bg-[#a95423] text-white font-bold rounded-lg text-[11px] shadow-sm">
              {selectedShipmentIds.length} Selected
            </span>
            <span className="text-slate-800 font-medium">
              Ready-to-pickup parcel(s) selected for Delhivery batch pickup request.
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedShipmentIds([])}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setPickupModalOpen(true)}
              className="px-4 py-2 bg-[#a95423] hover:bg-[#94451b] text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center space-x-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Batch Pickup ({selectedShipmentIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Shipments Data Table */}
      <div className="bg-card border border-border/40 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs font-light">Retrieving shipment records...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
            <Truck className="w-10 h-10 text-muted-foreground/50" />
            <div className="space-y-1 max-w-xs">
              <h3 className="text-sm font-semibold tracking-wide">No Shipments Found</h3>
              <p className="text-xs text-muted-foreground font-light">
                No shipment records match the active search parameters or status filters.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Top Pagination Controls */}
            {(totalPages > 1 || totalItems > 0) && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3.5 bg-background border-b border-border">
                <div className="text-xs font-light text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{shipments.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalItems}</span> shipments
                </div>
                <div className="flex items-center gap-6">
                  {/* Page Size Selector */}
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
                  {/* Page Nav */}
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-light border-collapse">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground uppercase text-[9px] font-bold tracking-wider bg-secondary/10">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllReadySelected}
                        onChange={toggleSelectAllReady}
                        title="Select all ready to pickup shipments"
                        className="rounded border-slate-300 text-[#a95423] focus:ring-[#a95423] cursor-pointer disabled:opacity-30"
                        disabled={readyToPickupShipments.length === 0}
                      />
                    </th>
                    <th className="py-3 px-5">Order & Courier ID</th>
                    <th className="py-3 px-5">Customer & Destination</th>
                    <th className="py-3 px-5">Provider / Carrier</th>
                    <th className="py-3 px-5">Waybill / AWB</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Created At</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((ship) => {
                    const isEligibleForPickup =
                      (ship.status === "ready_to_pickup" || ship.status === "manifested") &&
                      ship.provider === "delhivery";
                    const isSelected = selectedShipmentIds.includes(ship.id);

                    return (
                      <tr
                        key={ship.id}
                        className={`border-b border-border/10 last:border-0 transition cursor-pointer ${
                          isSelected ? "bg-[#a95423]/10 hover:bg-[#a95423]/15" : "hover:bg-secondary/15"
                        }`}
                        onClick={() => handleOpenDetail(ship.id)}
                      >
                        <td className="py-4 px-4 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectShipment(ship.id, e as any)}
                            disabled={!isEligibleForPickup}
                            title={
                              isEligibleForPickup
                                ? "Select for batch pickup"
                                : "Only ready_to_pickup Delhivery parcels can be selected for batch pickup"
                            }
                            className="rounded border-slate-300 text-[#a95423] focus:ring-[#a95423] cursor-pointer disabled:opacity-25"
                          />
                        </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-foreground">#{ship.orderId}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ID: {ship.courierOrderId} (Attempt #{ship.attemptNumber})
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{ship.customerName}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {ship.destinationCity}, {ship.destinationState} ({ship.destinationPincode})
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-medium text-foreground">{ship.carrier}</span>
                          {ship.isExternal && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                              Ext
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-5 font-mono font-bold text-pink-300">
                        {ship.trackingNumber}
                      </td>

                      <td className="py-4 px-5">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-full capitalize ${
                            ship.status === "delivered"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : ship.status === "cancelled"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : ship.status === "ndr"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {ship.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-muted-foreground">
                        {new Date(ship.createdAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-4 px-5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(ship.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {ship.provider === "delhivery" && ship.status !== "cancelled" && (
                          <button
                            onClick={() => printLabel(ship.orderId, "4R")}
                            className="p-1.5 text-pink-400 hover:bg-pink-500/10 rounded-lg transition"
                            title="Print 4R Label"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modals & Slide-Over Drawer */}
      <ServiceabilityCheckerModal
        isOpen={serviceabilityModalOpen}
        onClose={() => setServiceabilityModalOpen(false)}
      />

      <SchedulePickupModal
        isOpen={pickupModalOpen}
        onClose={() => setPickupModalOpen(false)}
        onSuccess={() => {
          loadShipments();
          setSelectedShipmentIds([]);
        }}
        selectedShipmentIds={selectedShipmentIds}
      />

      <ShipmentDetailDrawer
        shipmentId={selectedShipmentId}
        isOpen={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedShipmentId(null);
        }}
        onRefresh={() => loadShipments()}
        onOpenDispatchModal={(orderId) => {
          setDispatchOrderId(orderId);
          setDispatchModalOpen(true);
        }}
      />

      {dispatchOrderId && (
        <ShipmentDispatchModal
          isOpen={dispatchModalOpen}
          onClose={() => setDispatchModalOpen(false)}
          orderId={dispatchOrderId}
          onSuccess={() => loadShipments()}
        />
      )}
    </div>
  );
}
