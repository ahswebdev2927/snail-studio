"use client";

import React, { useState, useEffect } from "react";
import { customConfirm, customAlert } from "@/components/ui/alert-dialog-provider";
import { getOrderStatusBadgeStyle } from "@/components/orders/order-status-badge";
import { createPortal } from "react-dom";
import { 
  ClipboardList, 
  Filter, 
  Search, 
  X, 
  Loader2, 
  Truck, 
  CreditCard, 
  Clock, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText,
  AlertCircle,
  TrendingUp,
  Package,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  Pencil,
  History,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  AlertTriangle,
  RotateCcw,
  RefreshCw
} from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { ShipmentDispatchModal } from "@/components/admin/orders/shipment-dispatch-modal";
import { ShipmentAttemptsTimeline } from "@/components/admin/orders/shipment-attempts-timeline";
import { OrderCancellationModal } from "@/components/admin/orders/order-cancellation-modal";
import { ReturnRefundModal } from "@/components/admin/orders/return-refund-modal";

interface OrderListItem {
  id: string;
  userId: string | null;
  status: string;
  totalAmount: number;
  couponCode: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  hasReturnRequest?: boolean;
  returnRequest?: any;
  refundReason?: "Cancel" | "Return" | null;
}

interface OrderDetail {
  id: string;
  userId: string | null;
  status: string;
  totalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  couponCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  shippingChargePaid: number;
  currentShippingCharge: number;
  shippingDifference: number;
  shippingDifferencePaid: number;
  shippingDifferenceStatus: string;
  shippingCalculatedAt: string | null;
  shippingVerified: boolean;
  addressLockedAt: string | null;
  addressVersion: number;
  addressVerified: boolean;
  items: {
    id: string;
    variantId: string | null;
    quantity: number;
    price: number;
    discount: number;
    variant: {
      id: string;
      sku: string;
      name: string;
      price: number;
    } | null;
  }[];
  addresses: {
    id: string;
    type: "billing" | "shipping";
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }[];
  statusHistory: {
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }[];
  payments: {
    id: string;
    gateway: string;
    gatewayTransactionId: string | null;
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
  }[];
  shipments: {
    id: string;
    carrier: string;
    trackingNumber: string;
    status: string;
    shippedAt: string | null;
    estimatedDeliveryAt: string | null;
    events?: {
      id: string;
      status: string;
      location: string | null;
      description: string | null;
      timestamp: string;
    }[];
  }[];
  addressHistory?: {
    id: string;
    version: number;
    editedBy: string;
    oldAddress: string;
    newAddress: string;
    shippingBefore: number;
    shippingAfter: number;
    difference: number;
    reason: string | null;
    createdAt: string;
  }[];
  user?: {
    id: string;
    phoneNumber: string;
    email: string | null;
    name: string | null;
  } | null;
  returnRequests?: any[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Dialog/Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [updateNotes, setUpdateNotes] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnRefundModal, setShowReturnRefundModal] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState<any>(null);

  // Shipment Specific Form States
  const [shipCarrier, setShipCarrier] = useState("Delhivery");
  const [shipTrackingNumber, setShipTrackingNumber] = useState("");
  const [shipEstDelivery, setShipEstDelivery] = useState("");
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);

  const [updateShipStatus, setUpdateShipStatus] = useState("pickup_requested");
  const [updateShipLocation, setUpdateShipLocation] = useState("");
  const [updateShipDescription, setUpdateShipDescription] = useState("");
  const [isUpdatingShipment, setIsUpdatingShipment] = useState(false);
  const [isCancellingShipment, setIsCancellingShipment] = useState(false);

  // Label and Invoice Print Preview Modals
  const [showPrintLabel, setShowPrintLabel] = useState(false);
  const [showPrintInvoice, setShowPrintInvoice] = useState(false);
  const [showCreateShipmentModal, setShowCreateShipmentModal] = useState(false);

  // Shipping adjustment policy additions
  const [settings, setSettings] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [showAddressHistoryModal, setShowAddressHistoryModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset page when queries change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter]);

  // Edit address form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddressLine1, setEditAddressLine1] = useState("");
  const [editAddressLine2, setEditAddressLine2] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Action loaders
  const [isWaivingDifference, setIsWaivingDifference] = useState(false);
  const [isRefundingDifference, setIsRefundingDifference] = useState(false);
  const [isRegeneratingAwb, setIsRegeneratingAwb] = useState(false);

  // Load orders
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (debouncedSearchQuery.trim()) query.set("q", debouncedSearchQuery.trim());
      query.set("page", String(currentPage));
      query.set("limit", String(limit));

      const res = await fetch(`/api/admin/orders?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1);
            setTotalItems(data.pagination.totalItems || 0);
          }
        } else {
          setOrders(data);
          setTotalPages(1);
          setTotalItems(data.length);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, debouncedSearchQuery, currentPage, limit]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadSettings();
  }, []);

  // Load specific order details
  const loadOrderDetail = async (id: string) => {
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrderDetail(data);
        setUpdateStatus(data.status);
        setUpdateNotes("");
        
        // Fetch pre-shipment validations
        const valRes = await fetch(`/api/admin/orders/${id}/validate-preshipment`);
        if (valRes.ok) {
          const valData = await valRes.json();
          setValidationErrors(valData.errors || []);
        }
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleOpenDetail = (id: string) => {
    setSelectedOrderId(id);
    loadOrderDetail(id);
  };

  const handleCloseDetail = () => {
    setSelectedOrderId(null);
    setOrderDetail(null);
  };

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !updateStatus) return;

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updateStatus,
          notes: updateNotes.trim() || null,
        }),
      });

      if (res.ok) {
        // Reload order detail and catalog list
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const err = await res.json();
        await customAlert("Error", `Failed to update status: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      await customAlert("Error", "An unexpected error occurred.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setIsSavingAddress(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          addressLine1: editAddressLine1,
          addressLine2: editAddressLine2 || null,
          city: editCity,
          state: editState,
          postalCode: editPostalCode,
          country: editCountry,
          reason: editReason || null,
        }),
      });
      if (res.ok) {
        setShowEditAddressModal(false);
        setEditReason("");
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const err = await res.json();
        await customAlert("Error", `Failed to save address: ${err.error || "Server error"}`);
      }
    } catch (err) {
      console.error(err);
      await customAlert("Error", "An unexpected error occurred while saving address.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const handleGeneratePaymentLink = async () => {
    if (!selectedOrderId || !orderDetail) return;
    setIsGeneratingLink(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/generate-payment-link`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success && data.paymentLinkUrl) {
        const link = data.paymentLinkUrl;
        await navigator.clipboard.writeText(link);
        const custPhone = orderDetail.user?.phoneNumber || orderDetail.addresses.find(a => a.type === "shipping")?.phone || "";
        const cleanPhone = custPhone.replace(/[^0-9]/g, "");
        const waText = encodeURIComponent(`Hi ${orderDetail.user?.name || "Customer"}, please complete your shipping rate adjustment payment of ₹${data.amountRupees} for Order #${orderDetail.id}: ${link}`);
        
        if (cleanPhone) {
          window.open(`https://wa.me/${cleanPhone}?text=${waText}`, "_blank");
        }
        await customAlert(
          "Razorpay Payment Link Generated",
          `Razorpay payment link copied to clipboard:\n${link}${cleanPhone ? "\n\nOpening WhatsApp sharing window..." : ""}`
        );
      } else {
        await customAlert("Error", data.error || "Failed to generate payment link.");
      }
    } catch (err: any) {
      console.error("Error generating payment link:", err);
      await customAlert("Error", "An unexpected error occurred while generating payment link.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleWaiveDifference = async () => {
    if (!selectedOrderId) return;
    if (!await customConfirm("Cancel/Waive Off Shipping Difference", "Are you sure you want to waive off / cancel this shipping difference payment?")) return;
    setIsWaivingDifference(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/waive-difference`, {
        method: "POST",
      });
      if (res.ok) {
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const data = await res.json();
        await customAlert("Error", `Failed to cancel / waive off difference: ${data.error || "Server error"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWaivingDifference(false);
    }
  };

  const handleRefundDifference = async () => {
    if (!selectedOrderId) return;
    if (!await customConfirm("Refund Shipping Difference", "Are you sure you want to refund this shipping charge difference?")) return;
    setIsRefundingDifference(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/refund-difference`, {
        method: "POST",
      });
      if (res.ok) {
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const data = await res.json().catch(() => ({}));
        if (!data.verificationRequired) {
          await customAlert("Error", `Failed to process refund: ${data.error || "Server error"}`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefundingDifference(false);
    }
  };

  const handleRegenerateAwb = async () => {
    if (!selectedOrderId) return;
    if (!await customConfirm("Regenerate AWB", "Are you sure you want to cancel the active shipment and regenerate the AWB?")) return;
    setIsRegeneratingAwb(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/regenerate-awb`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        await customAlert("Success", `New AWB generated successfully: ${data.trackingNumber}`);
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const data = await res.json();
        await customAlert("Error", `Failed to regenerate AWB: ${data.error || "Server error"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRegeneratingAwb(false);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !shipCarrier || !shipTrackingNumber) return;

    setIsCreatingShipment(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier: shipCarrier,
          trackingNumber: shipTrackingNumber,
          estimatedDeliveryAt: shipEstDelivery || null,
        }),
      });

      if (res.ok) {
        setShipTrackingNumber("");
        setShipEstDelivery("");
        setShowCreateShipmentModal(false);
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const err = await res.json();
        await customAlert("Error", `Failed to generate shipment: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error creating shipment:", error);
      await customAlert("Error", "An unexpected error occurred.");
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleUpdateShipmentStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !updateShipStatus) return;

    setIsUpdatingShipment(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/shipment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: updateShipStatus,
          location: updateShipLocation.trim() || null,
          description: updateShipDescription.trim() || null,
        }),
      });

      if (res.ok) {
        setUpdateShipLocation("");
        setUpdateShipDescription("");
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const err = await res.json();
        await customAlert("Error", `Failed to update shipment: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error updating shipment status:", error);
      await customAlert("Error", "An unexpected error occurred.");
    } finally {
      setIsUpdatingShipment(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!selectedOrderId) return;
    if (!await customConfirm("Cancel Shipment", "Are you sure you want to cancel and delete this parcel shipment? This reverts the order state and cancels delivery.")) return;

    setIsCancellingShipment(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/shipment`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const data = await res.json();
        await customAlert("Error", `Failed to cancel shipment: ${data.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error cancelling shipment:", error);
      await customAlert("Error", "An unexpected error occurred.");
    } finally {
      setIsCancellingShipment(false);
    }
  };

  // Format currency helpers
  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Get status color badges for orders
  const getStatusBadge = (status: string) => {
    return getOrderStatusBadgeStyle(status);
  };

  // Compute status metrics based on loaded orders
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const processingCount = orders.filter(o => o.status === "processing").length;
  const completedCount = orders.filter(o => o.status === "delivered").length;
  const totalRevenue = orders
    .filter(o => ["paid", "processing", "ready_to_ship", "shipped", "delivered"].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">Order Manager</h1>
          <p className="text-xs text-muted-foreground font-light">
            Track customer transactions, transition shipping statuses, and view audit trail logs.
          </p>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Volume Revenue</span>
            <p className="font-serif text-xl font-semibold text-foreground">{formatPrice(totalRevenue)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-success/15 text-success">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Awaiting Payment</span>
            <p className="font-serif text-xl font-semibold text-foreground">{pendingCount} orders</p>
          </div>
          <div className="p-3 rounded-2xl bg-warning/15 text-warning">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">In Processing</span>
            <p className="font-serif text-xl font-semibold text-foreground">{processingCount} orders</p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delivered Success</span>
            <p className="font-serif text-xl font-semibold text-foreground">{completedCount} orders</p>
          </div>
          <div className="p-3 rounded-2xl bg-secondary text-secondary-foreground">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Query Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card border border-border/30 rounded-2xl p-4.5">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Order ID, name or phone..."
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

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "ALL" },
            { id: "placed", label: "PLACED" },
            { id: "confirmed", label: "CONFIRMED" },
            { id: "processing", label: "PROCESSING" },
            { id: "ready_to_ship", label: "READY TO SHIP" },
            { id: "shipped", label: "SHIPPED" },
            { id: "delivered", label: "DELIVERED" },
            { id: "cancelled_returns", label: "CANCEL / RETURNS" },
            { id: "refunds", label: "REFUNDS" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/40 hover:bg-secondary/70 text-muted-foreground border border-border/35"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table Catalog */}
      <div className="bg-card border border-border/40 rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs font-light">Retrieving transaction catalog...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h3 className="text-sm font-semibold tracking-wide">No Orders Found</h3>
              <p className="text-xs text-muted-foreground font-light leading-relaxed">
                Could not find any order entries matching the active status filter or search parameters.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Top Pagination Controls */}
            {(totalPages > 1 || totalItems > 0) && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3.5 bg-background border-b border-border">
                <div className="text-xs font-light text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{orders.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalItems}</span> orders
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
                  <th className="py-3 px-5">Order ID</th>
                  <th className="py-3 px-5">Customer details</th>
                  <th className="py-3 px-5">Placed Date</th>
                  <th className="py-3 px-5">Total Sum</th>
                  <th className="py-3 px-5">Coupon</th>
                  <th className="py-3 px-5">Fulfillment Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const customerName = order.customerName || "Guest shopper";
                  const contactDetails = order.customerPhone || order.customerEmail || "No info";

                  return (
                    <tr 
                      key={order.id} 
                      className="border-b border-border/10 last:border-0 hover:bg-secondary/15 transition-all cursor-pointer"
                      onClick={() => handleOpenDetail(order.id)}
                    >
                      <td className="py-4 px-5 font-mono font-bold text-foreground">{order.id}</td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{customerName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{contactDetails}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-muted-foreground">{formatDate(order.createdAt)}</td>
                      <td className="py-4 px-5 font-semibold text-foreground">{formatPrice(order.totalAmount)}</td>
                      <td className="py-4 px-5 font-mono text-muted-foreground">{order.couponCode || "—"}</td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider inline-block ${getStatusBadge(order.status)}`}>
                            {order.status.replace(/_/g, " ")}
                          </span>
                          {order.refundReason && (
                            <span className="text-[9px] font-medium text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded border border-border/30">
                              Reason: <strong className="text-foreground">{order.refundReason}</strong>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(order.id)}
                          className="px-3 py-1.5 bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 text-[10px] font-bold uppercase rounded-lg text-secondary transition-all cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {(totalPages > 1 || totalItems > 0) && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4.5 bg-background border-t border-border">
              <div className="text-xs font-light text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{orders.length}</span> of{" "}
                <span className="font-semibold text-foreground">{totalItems}</span> orders
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
          </>
        )}
      </div>

      {/* Details Inspect Modal Panel */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/80 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-3xl h-screen bg-card border-l border-border shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-normal text-foreground">Order Details</h3>
                  <span className="text-[10px] font-mono bg-secondary/10 text-secondary px-2 py-0.5 border border-secondary/20 rounded font-semibold">
                    {selectedOrderId}
                  </span>
                  {orderDetail && (
                    <button
                      type="button"
                      onClick={() => {
                        const phone = orderDetail.user?.phoneNumber || orderDetail.addresses.find(a => a.type === "shipping")?.phone || "";
                        const cleanPhone = phone.trim();
                        const shareLink = `${window.location.origin}/track?orderId=${orderDetail.id}&phone=${encodeURIComponent(cleanPhone)}`;
                        navigator.clipboard.writeText(shareLink);
                        setCopiedShareLink(true);
                        setTimeout(() => setCopiedShareLink(false), 2000);
                      }}
                      title="Share Order Tracking Link"
                      className="p-1 px-2 rounded-lg hover:bg-secondary/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center justify-center gap-1 border border-border/40"
                    >
                      {copiedShareLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-[8px]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-primary" />
                          <span className="text-primary font-bold uppercase tracking-wider text-[8px]">Share</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                {orderDetail && (
                  <p className="text-[10px] text-muted-foreground font-light">
                    Initiated on {formatDate(orderDetail.createdAt)}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-1.5 rounded-full hover:bg-secondary/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isDetailLoading || !orderDetail ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground py-24">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-light">Fetching transaction metadata...</p>
                </div>
              ) : (
                <>
                  {/* Banner / Current Status */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${getStatusBadge(orderDetail.status)}`}>
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">Fulfillment Status</p>
                        <p className="text-[10px] font-light opacity-90">Current state: {orderDetail.status}</p>
                      </div>
                    </div>
                    {orderDetail.couponCode && (
                      <span className="px-2.5 py-1 bg-background/30 text-[9px] font-bold uppercase tracking-wider rounded-lg border border-current">
                        Coupon: {orderDetail.couponCode}
                      </span>
                    )}
                  </div>

                  {/* Two Column details: Shipping & Order items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Items table */}
                    <div className="space-y-3 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5" />
                        Line Items Purchased
                      </h4>
                      <div className="border border-border/30 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs font-light border-collapse">
                          <thead>
                            <tr className="bg-secondary/10 border-b border-border/20 text-muted-foreground uppercase text-[8px] font-bold tracking-wider">
                              <th className="py-2.5 px-4">Item Name / SKU</th>
                              <th className="py-2.5 px-4 text-center">Qty</th>
                              <th className="py-2.5 px-4 text-right">Unit Price</th>
                              <th className="py-2.5 px-4 text-right">Total Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderDetail.items.map((item) => (
                              <tr key={item.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/5">
                                <td className="py-3 px-4">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-foreground">
                                      {item.variant?.name || "Product Variant Removed"}
                                    </span>
                                    <span className="text-[9px] font-mono text-muted-foreground">
                                      SKU: {item.variant?.sku || "N/A"}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center font-medium text-foreground">{item.quantity}</td>
                                <td className="py-3 px-4 text-right text-muted-foreground">{formatPrice(item.price)}</td>
                                <td className="py-3 px-4 text-right font-semibold text-foreground">
                                  {formatPrice(item.price * item.quantity)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-3 bg-secondary/15 rounded-2xl p-4.5 border border-border/20">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Financial Summary</h4>
                      <div className="space-y-1.5 text-xs font-light">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="text-foreground">{formatPrice(orderDetail.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Shipping fee</span>
                          <span className="text-foreground">{formatPrice(orderDetail.shippingAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Taxes GST</span>
                          <span className="text-foreground">{formatPrice(orderDetail.taxAmount)}</span>
                        </div>
                        {orderDetail.discountAmount > 0 && (
                          <div className="flex justify-between text-rose-500 font-medium">
                            <span>Coupon Discount</span>
                            <span>-{formatPrice(orderDetail.discountAmount)}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-border/25 flex justify-between font-serif text-sm font-bold text-foreground">
                          <span>Total Amount</span>
                          <span>{formatPrice(orderDetail.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Addresses */}
                    <div className="space-y-3 bg-secondary/15 rounded-2xl p-4.5 border border-border/20">
                      <div className="flex justify-between items-center pb-2 border-b border-border/10">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          Shipping Destination
                        </h4>
                        
                        <div className="flex items-center gap-2">
                          {/* History Icon Button */}
                          <button
                            type="button"
                            onClick={() => setShowAddressHistoryModal(true)}
                            className="p-1.5 bg-card hover:bg-secondary/15 text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer border border-border/30 flex items-center justify-center"
                            title="View Address Modification Audit Trail"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Address Button / Lock Badge */}
                          {orderDetail.addresses.filter(a => a.type === "shipping").map((addr) => {
                            const hasActiveShipment = orderDetail.shipments.some(s => s.status !== "cancelled");
                            const isTerminal = ["shipped", "delivered", "cancelled", "refunded"].includes(orderDetail.status.toLowerCase());
                            const isEditAllowed = !hasActiveShipment && !isTerminal;

                            return isEditAllowed ? (
                              <button
                                key={`edit-${addr.id}`}
                                type="button"
                                onClick={() => {
                                  setEditName(addr.name);
                                  setEditPhone(addr.phone);
                                  setEditAddressLine1(addr.addressLine1);
                                  setEditAddressLine2(addr.addressLine2 || "");
                                  setEditCity(addr.city);
                                  setEditState(addr.state);
                                  setEditPostalCode(addr.postalCode);
                                  setEditCountry(addr.country);
                                  setEditReason("");
                                  setShowEditAddressModal(true);
                                }}
                                className="p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                title="Edit Shipping Address (Available prior to shipment creation)"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span
                                key={`lock-${addr.id}`}
                                className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg transition-all flex items-center justify-center cursor-help"
                                title="Address Locked: A shipment (AWB) has already been created for this order."
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      {orderDetail.addresses.filter(a => a.type === "shipping").map((addr) => (
                        <div key={addr.id} className="text-xs font-light space-y-1 text-foreground leading-relaxed">
                          <p className="font-semibold text-foreground">{addr.name}</p>
                          <p>{addr.addressLine1}</p>
                          {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                          <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                          <p>{addr.country}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {addr.phone}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Shipping Adjustment Summary */}
                    <div className="space-y-3 bg-secondary/15 rounded-2xl p-4.5 border border-border/20">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        Shipping Adjustment Policy
                      </h4>
                      <div className="text-xs space-y-1.5 font-light text-foreground">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Original Shipping paid:</span>
                          <span className="font-medium">
                            {formatPrice(
                              orderDetail.shippingCalculatedAt !== null
                                ? orderDetail.currentShippingCharge - orderDetail.shippingDifference
                                : orderDetail.shippingChargePaid > 0
                                ? orderDetail.shippingChargePaid
                                : orderDetail.shippingAmount
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Shipping rate:</span>
                          <span className="font-medium">{formatPrice(orderDetail.currentShippingCharge || orderDetail.shippingAmount)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border/20 pt-1.5">
                          <span className="text-muted-foreground">Recalculated Difference:</span>
                          <span className={`font-semibold ${orderDetail.shippingDifference > 0 ? "text-warning" : orderDetail.shippingDifference < 0 ? "text-success" : "text-foreground"}`}>
                            {orderDetail.shippingDifference > 0 ? "+" : ""}{formatPrice(orderDetail.shippingDifference)}
                          </span>
                        </div>
                        
                        {orderDetail.shippingDifference !== 0 && (
                          <div className="bg-background/50 border border-border/30 rounded-xl p-2.5 mt-2 space-y-1.5">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground uppercase tracking-wider font-bold">Policy Status:</span>
                              <span className="uppercase font-mono font-bold text-primary">{orderDetail.shippingDifferenceStatus}</span>
                            </div>
                            
                            <p className="text-[10px] text-muted-foreground leading-normal">
                              {orderDetail.shippingDifferenceStatus === "pending" && "Waiting for customer to pay the remaining balance."}
                              {orderDetail.shippingDifferenceStatus === "waived" && "Difference was within ignore threshold or waived off / cancelled by admin."}
                              {orderDetail.shippingDifferenceStatus === "paid" && "Shipping adjustment paid by customer."}
                              {orderDetail.shippingDifferenceStatus === "refunded" && "Price difference credited back to original source."}
                            </p>

                            <div className="flex flex-wrap gap-2 pt-1 border-t border-border/20">
                              {orderDetail.shippingDifferenceStatus === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isGeneratingLink}
                                    onClick={handleGeneratePaymentLink}
                                    className="px-2 py-0.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded text-[8px] font-bold uppercase transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {isGeneratingLink ? "Generating..." : "Generate Payment Link"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isWaivingDifference}
                                    onClick={handleWaiveDifference}
                                    className="px-2 py-0.5 bg-transparent hover:bg-secondary/15 text-foreground border border-border rounded text-[8px] font-bold uppercase transition-all cursor-pointer"
                                  >
                                    {isWaivingDifference ? "Cancelling..." : "Waive Off / Cancel"}
                                  </button>
                                </>
                              )}

                              {orderDetail.shippingDifference < 0 && orderDetail.shippingDifferenceStatus !== "refunded" && (
                                <button
                                  type="button"
                                  disabled={isRefundingDifference}
                                  onClick={handleRefundDifference}
                                  className="px-2 py-0.5 bg-success text-foreground hover:bg-success/90 rounded text-[8px] font-bold uppercase transition-all cursor-pointer"
                                >
                                  {isRefundingDifference ? "Refunding..." : "Refund Difference"}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payments */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        Gateway Payments
                      </h4>
                      <div className="border border-border/25 rounded-2xl p-4.5 space-y-2.5">
                        {orderDetail.payments.length === 0 ? (
                          <p className="text-xs text-muted-foreground font-light italic">No checkout transaction record.</p>
                        ) : (
                          orderDetail.payments.map((pmt) => (
                            <div key={pmt.id} className="text-xs font-light space-y-1">
                              <div className="flex justify-between font-semibold">
                                <span className="text-foreground uppercase tracking-wide">{pmt.gateway} transaction</span>
                                <span className={pmt.status === "succeeded" ? "text-success" : "text-warning"}>
                                  {pmt.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono">ID: {pmt.gatewayTransactionId || "N/A"}</p>
                              <p className="text-[10px] text-muted-foreground">Processed: {formatDate(pmt.createdAt)}</p>
                              <p className="text-foreground font-bold">{formatPrice(pmt.amount)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Return & Replacement Details */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reverse / Replacement Details
                      </h4>
                      <div className="border border-border/25 rounded-2xl p-4.5 space-y-3 bg-secondary/10">
                        {(!orderDetail.returnRequests || orderDetail.returnRequests.length === 0) ? (
                          <p className="text-xs text-muted-foreground font-light italic">No return or replacement request for this order.</p>
                        ) : (
                          orderDetail.returnRequests.map((req: any) => (
                            <div key={req.id} className="space-y-2.5 text-xs">
                              <div className="flex items-center justify-between font-semibold border-b border-border/20 pb-2">
                                <span className="flex items-center gap-1.5 uppercase text-foreground">
                                  {req.type === "RETURN" ? <RotateCcw className="w-3.5 h-3.5 text-rose-500" /> : <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />}
                                  {req.type} REQUEST
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-500" :
                                  req.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500" :
                                  req.status === "REJECTED" ? "bg-destructive/10 text-destructive" :
                                  "bg-amber-500/10 text-amber-500"
                                }`}>
                                  {req.status.replace(/_/g, " ")}
                                </span>
                              </div>

                              <div className="space-y-1 text-[11px] text-muted-foreground">
                                <p><strong className="text-foreground">Reason:</strong> {req.reason}</p>
                                {req.customerNotes && <p><strong className="text-foreground">Customer Notes:</strong> "{req.customerNotes}"</p>}
                                {req.waybill && (
                                  <p><strong className="text-foreground">AWB / Waybill:</strong> {req.waybill}</p>
                                )}
                                <p><strong className="text-foreground">Payment Responsibility:</strong> {req.paymentResponsibility}</p>
                              </div>

                              {/* Action Button: Received and Verified -> Refund */}
                              <div className="pt-2 border-t border-border/20 flex justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedReturnRequest(req);
                                    setShowReturnRefundModal(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Received & Verified → Refund</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Shipments / Tracking */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        Parcel Shipments
                      </h4>
                      <ShipmentAttemptsTimeline
                        orderId={orderDetail.id}
                        shipments={orderDetail.shipments as any}
                        onRefresh={() => loadOrderDetail(orderDetail.id)}
                        onOpenDispatchModal={() => setShowCreateShipmentModal(true)}
                      />

                      <ShipmentDispatchModal
                        isOpen={showCreateShipmentModal}
                        onClose={() => setShowCreateShipmentModal(false)}
                        orderId={orderDetail.id}
                        customerPincode={orderDetail.addresses?.find(a => a.type === "shipping")?.postalCode}
                        shippingDifferenceStatus={orderDetail.shippingDifferenceStatus}
                        onSuccess={() => loadOrderDetail(orderDetail.id)}
                      />
                    </div>

                    {/* Notes by User */}
                    {orderDetail.notes && (
                      <div className="md:col-span-2 space-y-1 bg-warning/5 border border-warning/20 rounded-2xl p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-warning flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Shopper Notes
                        </span>
                        <p className="text-xs font-light text-foreground">{orderDetail.notes}</p>
                      </div>
                    )}

                    {/* Timeline logs */}
                    <div className="md:col-span-2 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Order History Audit Trail
                      </h4>
                      <div className="space-y-3.5 relative pl-4 border-l border-border/40 ml-2">
                        {orderDetail.statusHistory.map((log) => (
                          <div key={log.id} className="space-y-0.5 relative">
                            {/* Dot indicator */}
                            <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-border border border-card" />
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border rounded ${getStatusBadge(log.status)}`}>
                                {log.status}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-light">{formatDate(log.createdAt)}</span>
                            </div>
                            {log.notes && (
                              <p className="text-xs font-light text-muted-foreground italic pl-0.5">{log.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>


                  </div>
                </>
              )}
            </div>

            {/* Modal Footer / Context-Aware Action Controls */}
            {orderDetail && (() => {
              const hasActiveUndeliveredShipment = orderDetail.shipments?.some(
                (s) => s.status !== "cancelled" && s.status !== "delivered"
              );

              return (
                <div className="p-6 border-t border-border/40 bg-secondary/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Order Action Controls (Status: {orderDetail.status.toUpperCase()})
                    </span>
                    {["shipped", "delivered"].includes(orderDetail.status.toLowerCase()) && (
                      <span className="text-[9px] font-mono text-muted-foreground bg-muted px-2.5 py-0.5 rounded border border-border">
                        🔒 Logistics status automated via carrier tracking scans
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2.5 items-center">
                    {/* PLACED or PENDING or PAID */}
                    {(orderDetail.status === "placed" || orderDetail.status === "pending" || orderDetail.status === "paid") && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={async () => {
                            setIsUpdatingStatus(true);
                            try {
                              const res = await fetch(`/api/admin/orders/${orderDetail.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "confirmed", notes: "Order confirmed by admin after review." }),
                              });
                              if (res.ok) {
                                await loadOrderDetail(orderDetail.id);
                                await loadOrders();
                              } else {
                                const err = await res.json();
                                await customAlert("Error", err.error || "Failed to confirm order.");
                              }
                            } catch (e) {
                              await customAlert("Error", "Unexpected error.");
                            } finally {
                              setIsUpdatingStatus(false);
                            }
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Mark Confirmed"}
                        </button>

                        <button
                          type="button"
                          disabled={hasActiveUndeliveredShipment}
                          title={hasActiveUndeliveredShipment ? "Order cannot be cancelled or refunded while shipment is in progress. Shipment must be delivered or cancelled first." : undefined}
                          onClick={() => setShowCancelModal(true)}
                          className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed text-rose-600 dark:text-rose-400 border border-rose-600/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Cancel & Refund Order
                        </button>
                      </>
                    )}

                    {/* CONFIRMED */}
                    {orderDetail.status === "confirmed" && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={async () => {
                            setIsUpdatingStatus(true);
                            try {
                              const res = await fetch(`/api/admin/orders/${orderDetail.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "processing", notes: "Workshop processing started." }),
                              });
                              if (res.ok) {
                                await loadOrderDetail(orderDetail.id);
                                await loadOrders();
                              } else {
                                const err = await res.json();
                                await customAlert("Error", err.error || "Failed to start processing.");
                              }
                            } catch (e) {
                              await customAlert("Error", "Unexpected error.");
                            } finally {
                              setIsUpdatingStatus(false);
                            }
                          }}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Start Processing"}
                        </button>

                        <button
                          type="button"
                          disabled={hasActiveUndeliveredShipment}
                          title={hasActiveUndeliveredShipment ? "Order cannot be cancelled or refunded while shipment is in progress. Shipment must be delivered or cancelled first." : undefined}
                          onClick={() => setShowCancelModal(true)}
                          className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed text-rose-600 dark:text-rose-400 border border-rose-600/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Cancel & Refund Order
                        </button>
                      </>
                    )}

                    {/* PROCESSING */}
                    {orderDetail.status === "processing" && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={async () => {
                            setIsUpdatingStatus(true);
                            try {
                              const res = await fetch(`/api/admin/orders/${orderDetail.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "ready_to_ship", notes: "Package assembled and ready for shipment." }),
                              });
                              if (res.ok) {
                                await loadOrderDetail(orderDetail.id);
                                await loadOrders();
                              } else {
                                const err = await res.json();
                                await customAlert("Error", err.error || "Failed to mark ready to ship.");
                              }
                            } catch (e) {
                              await customAlert("Error", "Unexpected error.");
                            } finally {
                              setIsUpdatingStatus(false);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Mark Ready to Ship"}
                        </button>

                        <button
                          type="button"
                          disabled={hasActiveUndeliveredShipment}
                          title={hasActiveUndeliveredShipment ? "Order cannot be cancelled or refunded while shipment is in progress. Shipment must be delivered or cancelled first." : undefined}
                          onClick={() => setShowCancelModal(true)}
                          className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed text-rose-600 dark:text-rose-400 border border-rose-600/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Cancel & Refund Order
                        </button>
                      </>
                    )}

                    {/* READY TO SHIP */}
                    {orderDetail.status === "ready_to_ship" && (
                      <>
                        {!orderDetail.shipments?.some(s => s.status !== "cancelled") ? (
                          <button
                            type="button"
                            onClick={() => setShowCreateShipmentModal(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Generate Shipment
                          </button>
                        ) : (
                          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Active Shipment (AWB) Created</span>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={hasActiveUndeliveredShipment}
                          title={hasActiveUndeliveredShipment ? "Order cannot be cancelled or refunded while shipment is in progress. Shipment must be delivered or cancelled first." : undefined}
                          onClick={() => setShowCancelModal(true)}
                          className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed text-rose-600 dark:text-rose-400 border border-rose-600/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Cancel & Refund Order
                        </button>
                      </>
                    )}

                    {/* CANCELLED / REFUNDED / PARTIALLY_REFUNDED */}
                    {["cancelled", "refunded", "partially_refunded"].includes(orderDetail.status.toLowerCase()) && (
                      <span className="text-xs text-rose-500 font-semibold italic">
                        Order has been cancelled / refunded ({orderDetail.status.toUpperCase()}). No further administrative actions.
                      </span>
                    )}

                    {hasActiveUndeliveredShipment && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span>Cancel & Refund locked while active shipment is in progress</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Cancellation & Refund Modal */}
      {orderDetail && (
        <OrderCancellationModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          orderId={orderDetail.id}
          totalAmountPaise={orderDetail.totalAmount}
          onSuccess={async () => {
            await loadOrderDetail(orderDetail.id);
            await loadOrders();
          }}
        />
      )}

      {/* Return Refund Modal */}
      {orderDetail && (
        <ReturnRefundModal
          isOpen={showReturnRefundModal}
          onClose={() => {
            setShowReturnRefundModal(false);
            setSelectedReturnRequest(null);
          }}
          orderId={orderDetail.id}
          returnRequest={selectedReturnRequest}
          orderItems={orderDetail.items}
          totalAmountPaise={orderDetail.totalAmount}
          onSuccess={async () => {
            await loadOrderDetail(orderDetail.id);
            await loadOrders();
          }}
        />
      )}

      {/* Shipping Label Print Overlay */}
      {showPrintLabel && orderDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-300 shadow-2xl p-6 rounded-2xl w-full max-w-sm text-slate-900 font-sans print:p-0 print:border-0 print:shadow-none">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 print:hidden">
              <h3 className="font-semibold text-sm text-slate-800">Print Shipping Label</h3>
              <button
                onClick={() => setShowPrintLabel(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Label Layout */}
            <div className="py-6 space-y-6 text-xs leading-relaxed border-2 border-slate-950 p-4 rounded-lg my-4 bg-white">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-400 pb-3">
                <div>
                  <h4 className="font-bold text-sm tracking-wide">SNAIL STUDIO</h4>
                  <p className="text-[8px] text-slate-500 font-light">Luxury Handcrafted Press-On Nails</p>
                </div>
                <span className="px-2 py-0.5 border border-slate-950 font-bold text-[8px] uppercase tracking-wider rounded">
                  {orderDetail.shipments?.[0]?.carrier || "EXPRESS"}
                </span>
              </div>

              {/* Barcode Mock */}
              <div className="space-y-1 text-center">
                <div className="h-10 bg-slate-950 w-full flex gap-[1px] px-2 items-center justify-center overflow-hidden">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        width: i % 3 === 0 ? "4px" : i % 5 === 0 ? "1px" : "2px" 
                      }} 
                      className="bg-white h-full" 
                    />
                  ))}
                </div>
                <p className="font-mono text-[9px] tracking-widest font-bold">
                  {orderDetail.shipments?.[0]?.trackingNumber || "TRK9876543210"}
                </p>
              </div>

              {/* Addresses Grid */}
              <div className="space-y-4 pt-2 text-[11px]">
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">SHIP TO:</span>
                  {orderDetail.addresses.filter(a => a.type === "shipping").map((addr) => (
                    <div key={addr.id} className="font-bold">
                      <p>{addr.name}</p>
                      <p>{addr.addressLine1}</p>
                      {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                      <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                      <p className="text-[9px] font-mono mt-0.5">Contact: {addr.phone}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-500">
                  <span className="text-[7px] font-bold uppercase tracking-wider text-slate-400 block">RETURN ADDRESS:</span>
                  <p className="font-bold text-slate-600">Snail Studio Warehouse</p>
                  <p>12, Park Street Sector 2</p>
                  <p>Mumbai, Maharashtra - 400001</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Print Label
              </button>
              <button
                onClick={() => setShowPrintLabel(false)}
                className="flex-1 py-2 bg-secondary-surface text-secondary-btn-text hover:bg-muted rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center border border-border"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Print Overlay */}
      {showPrintInvoice && orderDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-300 shadow-2xl p-6 rounded-2xl w-full max-w-xl text-slate-900 font-sans print:p-0 print:border-0 print:shadow-none max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 print:hidden">
              <h3 className="font-semibold text-sm text-slate-800">Print Store Invoice</h3>
              <button
                onClick={() => setShowPrintInvoice(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invoice Layout */}
            <div className="py-6 space-y-6 text-xs leading-relaxed bg-white">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-serif text-lg font-bold tracking-wide">Snail Studio</h4>
                  <p className="text-[9px] text-slate-500">Luxury Press-On Nails Store</p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-sm">INVOICE</h3>
                  <p className="font-mono text-[9px] text-slate-500">Order ID: #{orderDetail.id}</p>
                  <p className="text-[9px] text-slate-500">Date: {formatDate(orderDetail.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 text-[10px]">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Billed To:</span>
                  {orderDetail.addresses.filter(a => a.type === "billing").map((addr) => (
                    <div key={addr.id} className="font-medium">
                      <p className="font-bold">{addr.name}</p>
                      <p>{addr.addressLine1}</p>
                      {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                      <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                      <p>{addr.country}</p>
                      <p>Phone: {addr.phone}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Shipped To:</span>
                  {orderDetail.addresses.filter(a => a.type === "shipping").map((addr) => (
                    <div key={addr.id} className="font-medium">
                      <p className="font-bold">{addr.name}</p>
                      <p>{addr.addressLine1}</p>
                      {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                      <p>{addr.city}, {addr.state} - {addr.postalCode}</p>
                      <p>{addr.country}</p>
                      <p>Phone: {addr.phone}</p>
                    </div>
                  ))}
                </div>
              </div>

              <table className="w-full border-collapse text-left text-[10px]">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500 font-bold uppercase">
                    <th className="py-2">Item Name / Option</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetail.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-2.5">
                        <p className="font-bold text-slate-800">{item.variant?.name || "Product Variant Removed"}</p>
                        <p className="text-[9px] text-slate-500">SKU: {item.variant?.sku || "N/A"}</p>
                      </td>
                      <td className="py-2.5 text-center font-semibold text-slate-800">{item.quantity}</td>
                      <td className="py-2.5 text-right text-slate-600">{(item.price / 100).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-bold text-slate-800">{((item.price * item.quantity) / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium text-slate-800">
                      {(orderDetail.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shipping Fee</span>
                    <span className="font-medium text-slate-800">{(orderDetail.shippingAmount / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax GST (18%)</span>
                    <span className="font-medium text-slate-800">{(orderDetail.taxAmount / 100).toFixed(2)}</span>
                  </div>
                  {orderDetail.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount</span>
                      <span>-{(orderDetail.discountAmount / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-300 flex justify-between text-xs font-bold text-slate-900">
                    <span>Grand Total (INR)</span>
                    <span>₹{(orderDetail.totalAmount / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-primary text-primary-foreground hover:bg-primary-hover rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Print Invoice
              </button>
              <button
                onClick={() => setShowPrintInvoice(false)}
                className="flex-1 py-2 bg-secondary-surface text-secondary-btn-text hover:bg-muted rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center border border-border"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal Overlay */}
      {showEditAddressModal && orderDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border shadow-2xl p-6 rounded-3xl w-full max-w-md text-foreground space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-border/40">
              <h3 className="font-serif text-base font-normal text-foreground">Edit Shipping Address</h3>
              <button
                type="button"
                onClick={() => setShowEditAddressModal(false)}
                className="p-1 rounded-full hover:bg-secondary/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recipient Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address Line 1</label>
                <input
                  type="text"
                  required
                  value={editAddressLine1}
                  onChange={(e) => setEditAddressLine1(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={editAddressLine2}
                  onChange={(e) => setEditAddressLine2(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">City</label>
                  <input
                    type="text"
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">State</label>
                  <input
                    type="text"
                    required
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pincode / Postal Code</label>
                  <input
                    type="text"
                    required
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Country</label>
                  <input
                    type="text"
                    required
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason for Edit</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer requested pincode fix"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  {isSavingAddress ? "Saving..." : "Save Address"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditAddressModal(false)}
                  className="flex-1 py-2.5 bg-transparent hover:bg-secondary/15 text-foreground rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center border border-border"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Address History Modal Overlay */}
      {showAddressHistoryModal && orderDetail && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-card border border-border shadow-2xl p-6 rounded-3xl w-full max-w-2xl text-foreground space-y-5 my-auto relative max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-border/40">
              <h3 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Address Modification Audit Trail
              </h3>
              <button
                type="button"
                onClick={() => setShowAddressHistoryModal(false)}
                className="p-1 rounded-full hover:bg-secondary/15 text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 relative pl-4 border-l border-border/40 ml-2">
              {(!orderDetail.addressHistory || orderDetail.addressHistory.length === 0) ? (
                <div className="text-xs text-muted-foreground italic py-3">
                  No address modifications recorded. The current shipping address is the original address provided at checkout.
                </div>
              ) : (
                orderDetail.addressHistory.map((ah: any) => {
                  let oldAddr: any = {};
                  let newAddr: any = {};
                  try {
                    oldAddr = JSON.parse(ah.oldAddress);
                    newAddr = JSON.parse(ah.newAddress);
                  } catch (e) {
                    console.error(e);
                  }
                  return (
                    <div key={ah.id} className="space-y-1 relative text-xs">
                      <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full bg-warning border border-card" />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-warning bg-warning/15 px-1.5 py-0.5 border border-warning/30 rounded">
                          Version {ah.version}
                        </span>
                        <span className="text-[10px] font-medium text-foreground">Edited by: {ah.editedBy}</span>
                        <span className="text-[9px] text-muted-foreground font-light">{formatDate(ah.createdAt)}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-light bg-background/50 border border-border/30 rounded-xl p-2.5">
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">Old Address:</span>
                          <p className="font-semibold text-foreground">{oldAddr.name} ({oldAddr.phone})</p>
                          <p className="text-muted-foreground">{oldAddr.addressLine1}, {oldAddr.city}, {oldAddr.state} - {oldAddr.postalCode}</p>
                          <p className="text-muted-foreground font-semibold">Shipping: {formatPrice(ah.shippingBefore)}</p>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">New Address:</span>
                          <p className="font-semibold text-foreground">{newAddr.name} ({newAddr.phone})</p>
                          <p className="text-muted-foreground">{newAddr.addressLine1}, {newAddr.city}, {newAddr.state} - {newAddr.postalCode}</p>
                          <p className="text-muted-foreground font-semibold">Shipping: {formatPrice(ah.shippingAfter)}</p>
                        </div>
                      </div>
                      {ah.reason && (
                        <p className="text-[10px] text-muted-foreground pl-1 leading-normal italic">
                          Reason: {ah.reason}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowAddressHistoryModal(false)}
                className="px-5 py-2 bg-transparent hover:bg-secondary/15 text-foreground text-xs font-semibold rounded-xl border border-border transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
