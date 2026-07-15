"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft,
  Users, 
  Phone, 
  Mail, 
  DollarSign, 
  Award, 
  Calendar, 
  ChevronRight, 
  Clock, 
  ShoppingBag, 
  Heart, 
  Star, 
  Search, 
  Key, 
  Ticket, 
  Plus, 
  X, 
  Loader2, 
  Eye, 
  Compass, 
  ShieldAlert, 
  MessageSquare,
  TrendingUp
} from "lucide-react";

interface CustomerDetails {
  id: string;
  name: string | null;
  phoneNumber: string;
  whatsappNumber: string | null;
  email: string | null;
  image: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface StatsSummary {
  totalSpent: number;
  completedOrdersCount: number;
  averageOrderValue: number;
  wishlistCount: number;
}

interface Preferences {
  favoriteShape: string;
  favoriteLength: string;
  favoriteCategory: string;
  favoriteCollection: string;
}

interface OrderItem {
  id: string;
  status: string;
  totalAmount: number;
  shippingAmount: number;
  discountAmount: number;
  createdAt: string;
}

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  priceMin: number;
  priceMax: number;
  media: { media: { url: string } }[];
}

interface RecentlyViewedProduct {
  id: string;
  name: string;
  slug: string;
  priceMin: number;
  priceMax: number;
  media: { media: { url: string } }[];
}

interface SearchLog {
  id: string;
  query: string;
  resultsCount: number;
  createdAt: string;
}

interface CouponRedemption {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  usedAt: string;
  orderId: string;
}

interface TimelineEvent {
  id: string;
  type: "login" | "order_placed" | "order_status_update" | "review_submitted" | "wishlist_added" | "search" | "email" | "coupon";
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

interface Customer360Payload {
  customer: CustomerDetails;
  stats: StatsSummary;
  preferences: Preferences;
  tags: string[];
  segments: string[];
  orders: OrderItem[];
  wishlist: WishlistProduct[];
  recentlyViewed: RecentlyViewedProduct[];
  searches: SearchLog[];
  coupons: CouponRedemption[];
  timeline: TimelineEvent[];
}

const PREDEFINED_TAGS = ["VIP", "Influencer", "Wholesale", "Staff", "Tester"];

export default function CustomerProfile360Page() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [data, setData] = useState<Customer360Payload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tag Editor State
  const [tags, setTags] = useState<string[]>([]);
  const [newTagText, setNewTagText] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"timeline" | "orders" | "wishlist" | "searches">("timeline");

  const loadCustomerData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`);
      if (res.ok) {
        const payload: Customer360Payload = await res.json();
        setData(payload);
        setTags(payload.tags || []);
        setError(null);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to load customer profile details.");
      }
    } catch (err: any) {
      console.error("Error fetching customer 360:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadCustomerData();
    }
  }, [id]);

  const handleAddTag = async (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    setIsAddingTag(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: trimmed }),
      });
      if (res.ok) {
        if (!tags.includes(trimmed)) {
          setTags([...tags, trimmed]);
        }
        setNewTagText("");
      }
    } catch (err) {
      console.error("Failed to add tag:", err);
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    try {
      const res = await fetch(`/api/admin/customers/${id}/tags?tag=${encodeURIComponent(tagToRemove)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTags(tags.filter(t => t !== tagToRemove));
      }
    } catch (err) {
      console.error("Failed to delete tag:", err);
    }
  };

  // Helpers
  const formatPrice = (priceInPaise: number) => {
    return `₹${(priceInPaise / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Render Timeline Icon helper
  const getTimelineIcon = (type: string) => {
    switch (type) {
      case "login":
        return <Key className="w-4 h-4 text-amber-500" />;
      case "order_placed":
        return <ShoppingBag className="w-4 h-4 text-primary" />;
      case "order_status_update":
        return <Clock className="w-4 h-4 text-sky-500" />;
      case "review_submitted":
        return <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
      case "wishlist_added":
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case "search":
        return <Search className="w-4 h-4 text-violet-500" />;
      case "email":
        return <Mail className="w-4 h-4 text-emerald-500" />;
      case "coupon":
        return <Ticket className="w-4 h-4 text-orange-500" />;
      default:
        return <Compass className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="py-32 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-light">Compiling Customer 360 Profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-4">
        <div className="p-4 bg-destructive/10 text-destructive rounded-full inline-block">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="font-serif text-xl font-semibold">Error Loading Profile</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">{error || "Customer data unavailable."}</p>
        <button 
          onClick={() => router.push("/admin/customers")}
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground px-5 py-2.5 rounded-full hover:bg-secondary/90 transition-all border border-border/40 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </button>
      </div>
    );
  }

  const { customer, stats, preferences, segments, orders: customerOrders, wishlist, recentlyViewed, searches, coupons } = data;
  const customerInitials = customer.name
    ? customer.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "S";

  return (
    <div className="space-y-6">
      {/* Back navigation & Page Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/customers")}
          className="p-2 border border-border/40 bg-card hover:bg-secondary/20 rounded-full transition-all cursor-pointer"
          aria-label="Back to customer list"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        </button>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Profile</span>
          <h1 className="font-serif text-2xl font-normal text-foreground">Customer 360 Portal</h1>
        </div>
      </div>

      {/* Grid: 360 Core Header & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card & Custom tags */}
        <div className="lg:col-span-2 bg-card border border-border/40 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row gap-6">
          {/* Avatar Details */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4 shrink-0">
            {customer.image ? (
              <img 
                src={customer.image} 
                alt={customer.name || "Customer"} 
                className="w-24 h-24 rounded-full object-cover border border-border ring-4 ring-primary/10 shadow"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-2xl font-bold shadow">
                {customerInitials}
              </div>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider ${
              customer.isActive
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
            }`}>
              {customer.isActive ? "Active Account" : "Banned"}
            </span>
          </div>

          {/* Shopper Details Content */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="font-serif text-xl font-medium text-foreground">{customer.name || "Guest Customer"}</h2>
              <span className="text-[9px] font-mono text-muted-foreground">ID: {customer.id}</span>
            </div>

            {/* Contacts list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5 font-light">
                <span className="text-[9px] font-bold text-muted-foreground uppercase block">Primary Phone</span>
                <span className="flex items-center gap-1 font-mono text-foreground">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  {customer.phoneNumber}
                </span>
              </div>
              <div className="space-y-1.5 font-light">
                <span className="text-[9px] font-bold text-muted-foreground uppercase block">WhatsApp Chat</span>
                {customer.whatsappNumber ? (
                  <a
                    href={`https://wa.me/${customer.whatsappNumber.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-emerald-500 hover:underline font-mono"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {customer.whatsappNumber}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Not linked</span>
                )}
              </div>
              <div className="space-y-1.5 font-light sm:col-span-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase block">Email Address</span>
                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-1 hover:underline font-mono text-foreground"
                  >
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    {customer.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">No email registered</span>
                )}
              </div>
            </div>

            {/* Tag Editor Block */}
            <div className="border-t border-border/20 pt-4 space-y-2">
              <span className="text-[9px] font-bold uppercase text-muted-foreground block">Customer Tags (Labels)</span>
              <div className="flex flex-wrap gap-1.5">
                {tags.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground italic">No labels assigned yet</span>
                ) : (
                  tags.map(tag => (
                    <span 
                      key={tag} 
                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase bg-secondary/80 border border-border/30 text-foreground px-2 py-0.5 rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              
              {/* Add Tag Section */}
              <div className="flex items-center gap-2 pt-2 max-w-xs">
                <select
                  value=""
                  onChange={(e) => handleAddTag(e.target.value)}
                  className="bg-secondary/40 border border-border/40 rounded-xl px-2 py-1.5 text-[10px] focus:outline-none focus:border-primary text-foreground font-semibold"
                >
                  <option value="" disabled>Add Predefined Tag...</option>
                  {PREDEFINED_TAGS.filter(t => !tags.includes(t)).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="text-[10px] text-muted-foreground font-light">or</span>
                <input
                  type="text"
                  placeholder="Custom Tag..."
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddTag(newTagText);
                    }
                  }}
                  className="flex-1 bg-secondary/40 border border-border/40 rounded-xl px-2 py-1 text-[10px] focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground/60"
                />
                <button
                  onClick={() => handleAddTag(newTagText)}
                  disabled={isAddingTag || !newTagText.trim()}
                  className="p-1 border border-primary/20 hover:border-primary bg-primary/10 text-primary rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  aria-label="Add custom tag"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Segmentation Lists */}
        <div className="bg-card border border-border/40 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Dynamic Segments</span>
            <div className="flex flex-col gap-2">
              {segments.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">Customer does not fit any segment.</span>
              ) : (
                segments.map(seg => (
                  <div 
                    key={seg} 
                    className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-2xl px-3.5 py-2 hover:bg-primary/10 transition-all"
                  >
                    <Award className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground leading-none">{seg}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-border/20 pt-4 text-[10px] font-light text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Shopper Joined:</span>
              <span className="font-semibold text-foreground">{formatDate(customer.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Signed In:</span>
              <span className="font-semibold text-foreground">
                {customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : "N/A"}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Grid: Stats strip and derived preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Spent (LTV) */}
        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Customer LTV</span>
            <p className="font-serif text-lg font-bold text-foreground">{formatPrice(stats.totalSpent)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <DollarSign className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Total completed orders */}
        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Completed Orders</span>
            <p className="font-serif text-lg font-bold text-foreground">{stats.completedOrdersCount} orders</p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <ShoppingBag className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Average Order</span>
            <p className="font-serif text-lg font-bold text-foreground">{formatPrice(stats.averageOrderValue)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500">
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Wishlist item counts */}
        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Wishlisted Sets</span>
            <p className="font-serif text-lg font-bold text-foreground">{stats.wishlistCount} items</p>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
            <Heart className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Shopper Derived Preferences Panel */}
      <div className="bg-card border border-border/40 rounded-3xl p-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-4">Derived Styling Preferences</span>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-secondary/20 border border-border/30 rounded-2xl p-4 text-center">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block mb-1">Favorite Shape</span>
            <span className="text-xs font-semibold text-foreground">{preferences.favoriteShape}</span>
          </div>
          <div className="bg-secondary/20 border border-border/30 rounded-2xl p-4 text-center">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block mb-1">Favorite Length</span>
            <span className="text-xs font-semibold text-foreground">{preferences.favoriteLength}</span>
          </div>
          <div className="bg-secondary/20 border border-border/30 rounded-2xl p-4 text-center">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block mb-1">Favorite Category</span>
            <span className="text-xs font-semibold text-foreground">{preferences.favoriteCategory}</span>
          </div>
          <div className="bg-secondary/20 border border-border/30 rounded-2xl p-4 text-center">
            <span className="text-[9px] text-muted-foreground uppercase font-bold block mb-1">Favorite Collection</span>
            <span className="text-xs font-semibold text-foreground">{preferences.favoriteCollection}</span>
          </div>
        </div>
      </div>

      {/* Main Portal Section: Tab Selection & Interactive Panels */}
      <div className="bg-card border border-border/30 rounded-3xl overflow-hidden shadow-sm flex flex-col">
        
        {/* Navigation Tabs bar */}
        <div className="flex border-b border-border/20 bg-secondary/10 overflow-x-auto scrollbar-none snap-x">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 snap-start ${
              activeTab === "timeline"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/5"
            }`}
          >
            Activity Timeline
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 snap-start ${
              activeTab === "orders"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/5"
            }`}
          >
            Order Registry ({customerOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 snap-start ${
              activeTab === "wishlist"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/5"
            }`}
          >
            Wishlist & Viewed
          </button>
          <button
            onClick={() => setActiveTab("searches")}
            className={`px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border-b-2 snap-start ${
              activeTab === "searches"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/5"
            }`}
          >
            Searches & Coupons ({searches.length + coupons.length})
          </button>
        </div>

        {/* Tab content displays */}
        <div className="p-6">
          
          {/* TAB 1: Activity Timeline */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              {data.timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">No timeline activity logged for this shopper.</p>
              ) : (
                <div className="relative pl-6 border-l border-border/30 ml-3 space-y-6 py-2">
                  {data.timeline.map((event) => (
                    <div key={event.id} className="relative group">
                      {/* Left timeline dot indicator with customized category icon */}
                      <div className="absolute -left-[35px] top-0.5 p-1.5 bg-card border border-border/50 rounded-full group-hover:scale-110 transition-all shadow-sm">
                        {getTimelineIcon(event.type)}
                      </div>
                      
                      {/* Event description */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{event.title}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDateTime(event.timestamp)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground/80 font-light">{event.description}</p>
                        
                        {/* Event action link if orders */}
                        {event.metadata?.orderId && (
                          <Link
                            href={`/admin/orders/${event.metadata.orderId}`}
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline"
                          >
                            Details of order {event.metadata.orderId}
                            <ChevronRight className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Orders History */}
          {activeTab === "orders" && (
            <div className="overflow-x-auto">
              {customerOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">Shopper has not placed any orders yet.</p>
              ) : (
                <table className="w-full text-left text-xs font-light border-collapse">
                  <thead>
                    <tr className="border-b border-border/20 text-muted-foreground uppercase text-[9px] font-bold tracking-wider">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Created Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Shipping Cost</th>
                      <th className="py-2.5 px-3">Redeemed Discount</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map((ord) => (
                      <tr key={ord.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/10">
                        <td className="py-3 px-3 font-semibold text-foreground">{ord.id}</td>
                        <td className="py-3 px-3 text-muted-foreground">{formatDate(ord.createdAt)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border tracking-wider inline-block ${
                            ord.status === "delivered"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : ord.status === "cancelled" || ord.status === "refunded"
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">{formatPrice(ord.totalAmount)}</td>
                        <td className="py-3 px-3 text-muted-foreground">{formatPrice(ord.shippingAmount)}</td>
                        <td className="py-3 px-3 text-rose-500">-{formatPrice(ord.discountAmount)}</td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/admin/orders/${ord.id}`}
                            className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline font-semibold"
                          >
                            Details
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: Wishlist & Viewed history */}
          {activeTab === "wishlist" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Wishlist */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  Wishlist Products ({wishlist.length})
                </span>
                
                {wishlist.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-6">Wishlist is currently empty.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wishlist.map((p) => {
                      const featuredImg = p.media && p.media.length > 0 ? p.media[0].media?.url : null;
                      return (
                        <div key={p.id} className="bg-secondary/20 border border-border/30 rounded-2xl p-3 flex gap-3 items-center">
                          {featuredImg ? (
                            <img 
                              src={featuredImg} 
                              alt={p.name} 
                              className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-secondary/80 border border-border flex items-center justify-center shrink-0">
                              <Eye className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-foreground truncate">{p.name}</h4>
                            <span className="text-[10px] text-muted-foreground font-mono">{p.slug}</span>
                            <span className="text-[10px] font-bold text-foreground block">{formatPrice(p.priceMin)}</span>
                          </div>
                          <Link 
                            href={`/admin/products?search=${encodeURIComponent(p.name)}`}
                            className="p-1.5 bg-card border border-border hover:bg-secondary/40 rounded-full transition-all cursor-pointer shrink-0"
                            aria-label={`View catalog details for product ${p.name}`}
                          >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Recently Viewed */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Recently Viewed History ({recentlyViewed.length})
                </span>

                {recentlyViewed.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-6">No historical views captured yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recentlyViewed.map((p) => {
                      const featuredImg = p.media && p.media.length > 0 ? p.media[0].media?.url : null;
                      return (
                        <div key={p.id} className="bg-secondary/20 border border-border/30 rounded-2xl p-3 flex gap-3 items-center">
                          {featuredImg ? (
                            <img 
                              src={featuredImg} 
                              alt={p.name} 
                              className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-secondary/80 border border-border flex items-center justify-center shrink-0">
                              <Eye className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-foreground truncate">{p.name}</h4>
                            <span className="text-[10px] text-muted-foreground font-mono">{p.slug}</span>
                            <span className="text-[10px] font-bold text-foreground block">{formatPrice(p.priceMin)}</span>
                          </div>
                          <Link 
                            href={`/admin/products?search=${encodeURIComponent(p.name)}`}
                            className="p-1.5 bg-card border border-border hover:bg-secondary/40 rounded-full transition-all cursor-pointer shrink-0"
                            aria-label={`View catalog details for product ${p.name}`}
                          >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: Searches & Coupons */}
          {activeTab === "searches" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Recent Searches */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Search className="w-3.5 h-3.5 text-primary" />
                  Recent Catalog Searches ({searches.length})
                </span>

                {searches.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-6">No catalog search queries captured.</p>
                ) : (
                  <div className="border border-border/30 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs font-light border-collapse">
                      <thead>
                        <tr className="border-b border-border/20 text-muted-foreground uppercase text-[9px] font-bold bg-secondary/15">
                          <th className="py-2.5 px-3">Search Query</th>
                          <th className="py-2.5 px-3">Matches Found</th>
                          <th className="py-2.5 px-3 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searches.map((s) => (
                          <tr key={s.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/10">
                            <td className="py-2.5 px-3 font-medium text-foreground">"{s.query}"</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{s.resultsCount} items</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">{formatDateTime(s.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Column: Coupons Applied */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-orange-500" />
                  Coupons Applied ({coupons.length})
                </span>

                {coupons.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-6">No coupon discount code redemptions recorded.</p>
                ) : (
                  <div className="border border-border/30 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs font-light border-collapse">
                      <thead>
                        <tr className="border-b border-border/20 text-muted-foreground uppercase text-[9px] font-bold bg-secondary/15">
                          <th className="py-2.5 px-3">Coupon Code</th>
                          <th className="py-2.5 px-3">Rate</th>
                          <th className="py-2.5 px-3">Order ID</th>
                          <th className="py-2.5 px-3 text-right">Redeemed Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coupons.map((cop) => (
                          <tr key={cop.id} className="border-b border-border/10 last:border-0 hover:bg-secondary/10">
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-orange-500/10 border border-orange-500/20 text-orange-500">
                                {cop.code}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-foreground font-medium">
                              {cop.discountType === "percentage" ? `${cop.discountValue}% Off` : `${formatPrice(cop.discountValue)} Off`}
                            </td>
                            <td className="py-2.5 px-3">
                              <Link href={`/admin/orders/${cop.orderId}`} className="text-primary hover:underline font-mono">
                                {cop.orderId}
                              </Link>
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">{formatDate(cop.usedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
