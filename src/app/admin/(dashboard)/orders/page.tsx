"use client";

import React, { useState, useEffect } from "react";
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
  HelpCircle
} from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface OrderListItem {
  id: string;
  userId: string | null;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  totalAmount: number;
  couponCode: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
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
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Dialog/Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [updateNotes, setUpdateNotes] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  // Load orders
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (debouncedSearchQuery.trim()) query.set("q", debouncedSearchQuery.trim());

      const res = await fetch(`/api/admin/orders?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, debouncedSearchQuery]);

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
        alert(`Failed to update status: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("An unexpected error occurred.");
    } finally {
      setIsUpdatingStatus(false);
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
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const err = await res.json();
        alert(`Failed to generate shipment: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error creating shipment:", error);
      alert("An unexpected error occurred.");
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
        alert(`Failed to update shipment: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error updating shipment status:", error);
      alert("An unexpected error occurred.");
    } finally {
      setIsUpdatingShipment(false);
    }
  };

  const handleCancelShipment = async () => {
    if (!selectedOrderId) return;
    if (!confirm("Are you sure you want to cancel and delete this parcel shipment? This reverts the order state and cancels delivery.")) return;

    setIsCancellingShipment(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderId}/shipment`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadOrderDetail(selectedOrderId);
        await loadOrders();
      } else {
        const err = await res.json();
        alert(`Failed to cancel shipment: ${err.error || "Server error"}`);
      }
    } catch (error) {
      console.error("Error cancelling shipment:", error);
      alert("An unexpected error occurred.");
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
    switch (status) {
      case "paid":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "processing":
        return "bg-primary/10 text-primary border-primary/20";
      case "shipped":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "delivered":
        return "bg-secondary text-secondary-foreground border-border";
      case "cancelled":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "refunded":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default:
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    }
  };

  // Compute status metrics based on loaded orders
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const processingCount = orders.filter(o => o.status === "processing").length;
  const completedCount = orders.filter(o => o.status === "delivered").length;
  const totalRevenue = orders
    .filter(o => ["paid", "processing", "shipped", "delivered"].includes(o.status))
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
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Awaiting Payment</span>
            <p className="font-serif text-xl font-semibold text-foreground">{pendingCount} orders</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
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
          {["all", "pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/40 hover:bg-secondary/70 text-muted-foreground border border-border/35"
              }`}
            >
              {status}
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
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider inline-block ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(order.id)}
                          className="px-3 py-1.5 bg-secondary hover:bg-muted border border-border text-[10px] font-bold uppercase rounded-lg text-foreground transition-all cursor-pointer"
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
                  <span className="text-[10px] font-mono bg-secondary px-2 py-0.5 border border-border rounded text-muted-foreground">
                    {selectedOrderId}
                  </span>
                </div>
                {orderDetail && (
                  <p className="text-[10px] text-muted-foreground font-light">
                    Initiated on {formatDate(orderDetail.createdAt)}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseDetail}
                className="p-1.5 rounded-full bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
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
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Shipping Destination
                      </h4>
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
                                <span className={pmt.status === "succeeded" ? "text-emerald-500" : "text-amber-500"}>
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

                    {/* Shipments / Tracking */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" />
                        Parcel Shipments
                      </h4>
                      {orderDetail.shipments.length === 0 ? (
                        <div className="border border-border/25 rounded-2xl p-4.5 space-y-4">
                          <p className="text-xs text-muted-foreground font-light italic">No active parcel waybill generated.</p>
                          
                          <form onSubmit={handleCreateShipment} className="space-y-3 pt-2 border-t border-border/10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">Create Parcel Shipment</span>
                            
                            <div className="space-y-1">
                              <label className="text-[8px] uppercase font-bold text-muted-foreground">Select Courier</label>
                              <select
                                value={shipCarrier}
                                onChange={(e) => setShipCarrier(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                              >
                                <option value="Delhivery">Delhivery</option>
                                <option value="BlueDart">BlueDart</option>
                                <option value="NimbusPost">NimbusPost</option>
                                <option value="Shiprocket">Shiprocket</option>
                                <option value="Local Courier">Local Courier</option>
                                <option value="Self Delivery">Self Delivery / Store Pickup</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[8px] uppercase font-bold text-muted-foreground">Waybill / Tracking Number</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. TRK9876543210"
                                value={shipTrackingNumber}
                                onChange={(e) => setShipTrackingNumber(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[8px] uppercase font-bold text-muted-foreground">Est. Delivery Date</label>
                              <input
                                type="date"
                                value={shipEstDelivery}
                                onChange={(e) => setShipEstDelivery(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={isCreatingShipment}
                              className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 mt-1.5"
                            >
                              {isCreatingShipment ? "Generating..." : "Generate Waybill"}
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="border border-border/25 rounded-2xl p-4.5 space-y-4">
                          {orderDetail.shipments.map((ship) => (
                            <div key={ship.id} className="space-y-4">
                              {/* Header Info */}
                              <div className="text-xs font-light space-y-1 bg-secondary/25 border border-border/20 rounded-xl p-3">
                                <div className="flex justify-between font-semibold">
                                  <span className="text-foreground">{ship.carrier}</span>
                                  <span className="text-blue-500 uppercase text-[10px]">{ship.status.replace(/_/g, " ")}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-mono">Waybill: {ship.trackingNumber}</p>
                                {ship.shippedAt && (
                                  <p className="text-[10px] text-muted-foreground">Dispatched: {formatDate(ship.shippedAt)}</p>
                                )}
                                {ship.estimatedDeliveryAt && (
                                  <p className="text-[10px] text-muted-foreground">Est. Delivery: {formatDate(ship.estimatedDeliveryAt)}</p>
                                )}
                              </div>

                              {/* Print Documents Actions */}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowPrintLabel(true)}
                                  className="flex-1 py-1.5 bg-secondary hover:bg-muted text-[9px] font-bold uppercase tracking-wider rounded-lg border border-border text-foreground transition-all cursor-pointer text-center"
                                >
                                  Print Label
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowPrintInvoice(true)}
                                  className="flex-1 py-1.5 bg-secondary hover:bg-muted text-[9px] font-bold uppercase tracking-wider rounded-lg border border-border text-foreground transition-all cursor-pointer text-center"
                                >
                                  Print Invoice
                                </button>
                              </div>

                              {/* Events List */}
                              <div className="space-y-2 border-t border-border/10 pt-3">
                                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">Shipment History</span>
                                {ship.events && ship.events.length > 0 ? (
                                  <div className="space-y-3.5 pl-2.5 border-l border-border/30 ml-1">
                                    {ship.events.map((evt) => (
                                      <div key={evt.id} className="relative text-[10px] leading-relaxed">
                                        <div className="absolute -left-[14.5px] top-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <div className="flex justify-between items-center text-[9px] text-muted-foreground font-mono">
                                          <span className="uppercase font-bold tracking-wide text-[8px]">{evt.status.replace(/_/g, " ")}</span>
                                          <span>{new Date(evt.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>
                                        {evt.location && <p className="font-semibold text-foreground text-[9px]">Location: {evt.location}</p>}
                                        {evt.description && <p className="text-muted-foreground text-[9px] font-light italic mt-0.5">{evt.description}</p>}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground font-light italic">No events logged.</p>
                                )}
                              </div>

                              {/* Update Shipment Status Form */}
                              <form onSubmit={handleUpdateShipmentStatus} className="space-y-3 border-t border-border/10 pt-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">Update Shipment Event</span>
                                
                                <div className="space-y-1">
                                  <label className="text-[8px] uppercase font-bold text-muted-foreground">Select Status</label>
                                  <select
                                    value={updateShipStatus}
                                    onChange={(e) => setUpdateShipStatus(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                                  >
                                    <option value="pickup_requested">Pickup Requested</option>
                                    <option value="pickup_scheduled">Pickup Scheduled</option>
                                    <option value="pickup_completed">Pickup Completed (Dispatched)</option>
                                    <option value="in_transit">In Transit</option>
                                    <option value="reached_destination_hub">Reached Hub</option>
                                    <option value="out_for_delivery">Out For Delivery</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="delivery_attempted">Delivery Attempted</option>
                                    <option value="delivery_failed">Delivery Failed</option>
                                    <option value="rto_initiated">RTO Initiated</option>
                                    <option value="cancelled">Cancel Shipment</option>
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[8px] uppercase font-bold text-muted-foreground">Current Hub Location</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Mumbai Hub, Delhi Sorting"
                                    value={updateShipLocation}
                                    onChange={(e) => setUpdateShipLocation(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[8px] uppercase font-bold text-muted-foreground">Shipment Note / Description</label>
                                  <textarea
                                    placeholder="e.g. Package arrived at Mumbai hub."
                                    value={updateShipDescription}
                                    onChange={(e) => setUpdateShipDescription(e.target.value)}
                                    rows={2}
                                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary resize-none"
                                  />
                                </div>

                                <button
                                  type="submit"
                                  disabled={isUpdatingShipment}
                                  className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                                >
                                  {isUpdatingShipment ? "Updating..." : "Add Event Update"}
                                </button>
                              </form>

                              {/* Cancel Shipment button */}
                              <button
                                type="button"
                                onClick={handleCancelShipment}
                                disabled={isCancellingShipment}
                                className="w-full py-2 border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center mt-2"
                              >
                                {isCancellingShipment ? "Cancelling..." : "Cancel Shipment"}
                              </button>

                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Notes by User */}
                    {orderDetail.notes && (
                      <div className="md:col-span-2 space-y-1 bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
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
                              <span className="text-[10px] font-bold uppercase text-foreground bg-secondary px-1.5 py-0.5 border border-border rounded">
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

            {/* Modal Footer / Update workflow */}
            {orderDetail && (
              <div className="p-6 border-t border-border/40 bg-secondary/10">
                <form onSubmit={handleStatusTransition} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Fulfillment Transition
                      </label>
                      <select
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                        className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="delivered">delivered</option>
                        <option value="cancelled">cancelled</option>
                        <option value="refunded">refunded</option>
                      </select>
                    </div>

                    <div className="flex-[2] space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Internal Notes / Reason
                      </label>
                      <input
                        type="text"
                        placeholder="State change triggers audit record entry..."
                        value={updateNotes}
                        onChange={(e) => setUpdateNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-border rounded-xl text-xs font-light text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingStatus}
                      className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 h-[37px]"
                    >
                      {isUpdatingStatus ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Update State"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
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
                className="flex-1 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Print Label
              </button>
              <button
                onClick={() => setShowPrintLabel(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
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
                className="flex-1 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Print Invoice
              </button>
              <button
                onClick={() => setShowPrintInvoice(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
