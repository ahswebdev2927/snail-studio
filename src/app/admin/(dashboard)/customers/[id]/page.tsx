"use client";

import React, { useState, useEffect, useRef } from "react";
import { customAlert } from "@/components/ui/alert-dialog-provider";
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
  TrendingUp,
  Monitor,
  Smartphone,
  Percent,
  Send
} from "lucide-react";
import { sendTargetedWishlistEmailAction, sendTargetedCartAbandonedEmailAction } from "@/features/marketing/actions";

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

interface CartItemDetails {
  productId: string;
  name: string;
  variantName: string;
  price: number;
  quantity: number;
}

interface AvailableCouponDetails {
  id: string;
  code: string;
  description: string;
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
  cart?: CartItemDetails[];
  availableCoupons?: AvailableCouponDetails[];
}

const PREDEFINED_TAGS = ["VIP", "Influencer", "Wholesale", "Staff", "Tester"];

const DEFAULT_WISHLIST_HTML = `<html>
  <body style="font-family: Arial, sans-serif; color: #2C2520; background-color: #FCFAF7; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border: 1px solid #EAE6DF; border-radius: 15px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
      <h1 style="color: #A85328; font-family: Georgia, serif; font-size: 24px; text-align: center; margin-bottom: 25px;">Your Saved Styles Await</h1>
      <p>Hello {{customer_name}},</p>
      <p>We noticed you saved some premium, reusable press-on nail sets in your wishlist. Because our artists paint each set by hand in small batches, popular designs and sizes sell out quickly.</p>
      
      <h3 style="color: #A85328; border-bottom: 1px solid #EAE6DF; padding-bottom: 8px; margin-top: 25px;">Saved Items in Your Wishlist</h3>
      <div style="margin: 20px 0;">
        {{wishlist_products}}
      </div>

      {{coupon_block}}

      <p style="text-align: center; margin: 30px 0;">
        <a href="http://localhost:3000/shop" style="background-color: #A85328; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px;">Return & Order Now</a>
      </p>
      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #EAE6DF; padding-top: 15px;">
        Snail Studios &bull; Premium Reusable Handcrafted Press-On Nails
      </p>
    </div>
  </body>
</html>`;

const DEFAULT_CART_HTML = `<html>
  <body style="font-family: Arial, sans-serif; color: #2C2520; background-color: #FCFAF7; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border: 1px solid #EAE6DF; border-radius: 15px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
      <h1 style="color: #A85328; font-family: Georgia, serif; font-size: 24px; text-align: center; margin-bottom: 25px;">Don't Leave Your Nails Behind</h1>
      <p>Hello {{customer_name}},</p>
      <p>We saved the handcrafted sets left in your shopping cart. Because our nail sets are painted by hand in limited batches, your cart reservation will expire soon and items may sell out.</p>
      
      <h3 style="color: #A85328; border-bottom: 1px solid #EAE6DF; padding-bottom: 8px; margin-top: 25px;">Items in Your Shopping Cart</h3>
      <div style="margin: 20px 0;">
        {{cart_products}}
      </div>

      {{coupon_block}}

      <p style="text-align: center; margin: 30px 0;">
        <a href="http://localhost:3000/cart" style="background-color: #A85328; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px;">Complete My Checkout</a>
      </p>
      <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #EAE6DF; padding-top: 15px;">
        Snail Studios &bull; Premium Reusable Handcrafted Press-On Nails
      </p>
    </div>
  </body>
</html>`;

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

  // Marketing targeted campaign dispatch states
  const [selectedWishlistCouponId, setSelectedWishlistCouponId] = useState("");
  const [selectedCartCouponId, setSelectedCartCouponId] = useState("");
  const [isWishlistSending, setIsWishlistSending] = useState(false);
  const [isCartSending, setIsCartSending] = useState(false);
  const [wishlistTriggerMessage, setWishlistTriggerMessage] = useState("");
  const [cartTriggerMessage, setCartTriggerMessage] = useState("");

  // Custom message modal state
  const [isCustomCampaignModalOpen, setIsCustomCampaignModalOpen] = useState(false);
  const [customCampaignType, setCustomCampaignType] = useState<"wishlist" | "cart" | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [customBodyHtml, setCustomBodyHtml] = useState("");
  const [customCouponId, setCustomCouponId] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const modalMirrorRef = useRef<HTMLDivElement>(null);

  const handleModalScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const mirror = modalMirrorRef.current;
    if (mirror) {
      mirror.scrollTop = e.currentTarget.scrollTop;
      mirror.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const highlightPlaceholders = (text: string) => {
    const parts = text.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);
    return parts.map((part, index) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        return (
          <span
            key={index}
            className="bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold px-0.5 rounded border border-amber-500/30"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const insertPlaceholderIntoModal = (tag: string) => {
    const textarea = modalTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newValue = before + tag + after;
    setCustomBodyHtml(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 0);
  };

  const getCompiledPreview = () => {
    let html = customBodyHtml;
    
    // Replace user name
    const userName = data?.customer?.name || "Jane Doe";
    html = html.replace(/\{\{customer_name\}\}/g, userName);
    
    // Replace coupon code
    let couponCode = "WELCOME10";
    if (customCouponId) {
      const coup = availableCoupons.find(c => c.id === customCouponId);
      if (coup) couponCode = coup.code;
    }
    html = html.replace(/\{\{coupon_code\}\}/g, couponCode);

    // Replace coupon block if it exists
    const couponBlock = customCouponId 
      ? `<div style="border: 2px dashed #A85328; background-color: #FAF6F0; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0;">
          <p style="margin: 0; font-size: 13px; color: #666;">Enjoy a special discount on your purchase:</p>
          <h2 style="font-family: monospace; font-size: 24px; margin: 8px 0; color: #A85328; letter-spacing: 2px;">${couponCode}</h2>
         </div>`
      : "";
    html = html.replace(/\{\{coupon_block\}\}/g, couponBlock);

    // Replaces products
    if (customCampaignType === "wishlist") {
      const productsHtml = (data?.wishlist || []).map(p => {
        const featuredImg = p.media && p.media.length > 0 ? p.media[0].media?.url : "https://via.placeholder.com/150";
        return `
          <div style="display: flex; gap: 15px; align-items: center; border: 1px solid #EAE6DF; padding: 12px; border-radius: 12px; margin-bottom: 10px;">
            <img src="${featuredImg}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" />
            <div>
              <h4 style="margin: 0; font-size: 14px; color: #2C2520;">${p.name}</h4>
              <span style="font-size: 12px; color: #A85328; font-weight: bold;">₹${p.priceMin}</span>
            </div>
          </div>
        `;
      }).join("");
      html = html.replace(/\{\{wishlist_products\}\}/g, productsHtml || "<p style='font-style: italic; color: #999;'>No items in wishlist</p>");
    } else {
      const cartHtml = (data?.cart || []).map(item => {
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #EAE6DF; padding: 12px; border-radius: 12px; margin-bottom: 10px;">
            <div>
              <h4 style="margin: 0; font-size: 14px; color: #2C2520;">${item.name}</h4>
              <span style="font-size: 11px; color: #777;">Variant: ${item.variantName}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 12px; color: #777;">${item.quantity} &times; </span>
              <span style="font-size: 12px; color: #2C2520; font-weight: bold;">₹${item.price}</span>
            </div>
          </div>
        `;
      }).join("");
      html = html.replace(/\{\{cart_products\}\}/g, cartHtml || "<p style='font-style: italic; color: #999;'>No items in cart</p>");
    }

    return html;
  };

  const handleSendWishlistReminder = async () => {
    if (isWishlistSending) return;
    setIsWishlistSending(true);
    setWishlistTriggerMessage("");
    try {
      const res = await sendTargetedWishlistEmailAction(
        id as string,
        customCouponId || null,
        customSubject,
        customBodyHtml
      );
      if (res.success) {
        setWishlistTriggerMessage("✅ Wishlist reminder email sent successfully!");
        setIsCustomCampaignModalOpen(false);
        loadTimelineData(timelinePage, timelineLimit, timelineType);
      } else {
        await customAlert("Error", `Error: ${res.error || "Failed to send"}`);
      }
    } catch (err: any) {
      await customAlert("Error", `Exception: ${err.message || String(err)}`);
    } finally {
      setIsWishlistSending(false);
      setTimeout(() => setWishlistTriggerMessage(""), 5000);
    }
  };

  const handleSendCartRecovery = async () => {
    if (isCartSending) return;
    setIsCartSending(true);
    setCartTriggerMessage("");
    try {
      const res = await sendTargetedCartAbandonedEmailAction(
        id as string,
        customCouponId || null,
        customSubject,
        customBodyHtml
      );
      if (res.success) {
        setCartTriggerMessage("✅ Cart recovery email sent successfully!");
        setIsCustomCampaignModalOpen(false);
        loadTimelineData(timelinePage, timelineLimit, timelineType);
      } else {
        await customAlert("Error", `Error: ${res.error || "Failed to send"}`);
      }
    } catch (err: any) {
      await customAlert("Error", `Exception: ${err.message || String(err)}`);
    } finally {
      setIsCartSending(false);
      setTimeout(() => setCartTriggerMessage(""), 5000);
    }
  };

  // Timeline Pagination and Filtering State
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineLimit, setTimelineLimit] = useState(10);
  const [timelineType, setTimelineType] = useState("");
  const [totalTimelinePages, setTotalTimelinePages] = useState(1);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  const loadTimelineData = async (page: number, limit: number, type: string) => {
    setIsTimelineLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        type: type
      });
      const res = await fetch(`/api/admin/customers/${id}/timeline?${query.toString()}`);
      if (res.ok) {
        const payload = await res.json();
        setTimelineEvents(payload.events || []);
        setTotalTimelinePages(payload.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching timeline:", err);
    } finally {
      setIsTimelineLoading(false);
    }
  };

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

  useEffect(() => {
    if (id) {
      loadTimelineData(timelinePage, timelineLimit, timelineType);
    }
  }, [id, timelinePage, timelineLimit, timelineType]);

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

  const { 
    customer, 
    stats, 
    preferences, 
    segments, 
    orders: customerOrders, 
    wishlist, 
    recentlyViewed, 
    searches, 
    coupons,
    cart = [],
    availableCoupons = []
  } = data;
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
              {/* Filter and Limit selectors */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Filter Log:</span>
                  <select
                    value={timelineType}
                    onChange={(e) => {
                      setTimelineType(e.target.value);
                      setTimelinePage(1); // Reset page on filter change
                    }}
                    className="bg-secondary/40 border border-border/40 focus:border-primary focus:outline-none rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground cursor-pointer"
                  >
                    <option value="">All Events</option>
                    <option value="login">Sign-ins</option>
                    <option value="orders">Orders</option>
                    <option value="reviews">Reviews</option>
                    <option value="wishlist">Wishlist</option>
                    <option value="search">Searches</option>
                    <option value="email">Emails</option>
                    <option value="coupon">Coupons</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Logs per page:</span>
                  <select
                    value={timelineLimit}
                    onChange={(e) => {
                      setTimelineLimit(Number(e.target.value));
                      setTimelinePage(1); // Reset page on limit change
                    }}
                    className="bg-secondary/40 border border-border/40 focus:border-primary focus:outline-none rounded-xl px-2.5 py-1 text-xs font-semibold text-foreground cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {isTimelineLoading ? (
                <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs font-light">Loading timeline logs...</p>
                </div>
              ) : timelineEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-8 text-center">No timeline activity matches the filter criteria.</p>
              ) : (
                <div className="relative pl-6 border-l border-border/30 ml-3 space-y-6 py-2">
                  {timelineEvents.map((event) => (
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

              {/* Pagination controls */}
              {!isTimelineLoading && totalTimelinePages > 1 && (
                <div className="flex items-center justify-between border-t border-border/10 pt-4 mt-6">
                  <span className="text-[10px] text-muted-foreground font-light">
                    Showing page {timelinePage} of {totalTimelinePages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTimelinePage(prev => Math.max(1, prev - 1))}
                      disabled={timelinePage === 1}
                      className="px-3.5 py-1.5 border border-border/40 bg-secondary/20 hover:bg-secondary/40 text-xs font-semibold rounded-lg disabled:opacity-40 transition-all cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setTimelinePage(prev => Math.min(totalTimelinePages, prev + 1))}
                      disabled={timelinePage === totalTimelinePages}
                      className="px-3.5 py-1.5 border border-border/40 bg-secondary/20 hover:bg-secondary/40 text-xs font-semibold rounded-lg disabled:opacity-40 transition-all cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
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

          {/* TAB 3: Wishlist, Cart & Viewed history */}
          {activeTab === "wishlist" && (
            <div className="space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column: Wishlist Products & Email Dispatch */}
                <div className="bg-card border border-border/30 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      Wishlist Products ({wishlist.length})
                    </span>
                  </div>

                  {wishlist.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4">Wishlist is currently empty.</p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {wishlist.map((p) => {
                        const featuredImg = p.media && p.media.length > 0 ? p.media[0].media?.url : null;
                        return (
                          <div key={p.id} className="bg-secondary/15 border border-border/20 rounded-xl p-2.5 flex gap-3 items-center text-xs">
                            {featuredImg ? (
                              <img src={featuredImg} alt={p.name} className="w-10 h-10 rounded-lg object-cover border shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-secondary border flex items-center justify-center shrink-0">
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-foreground truncate">{p.name}</h4>
                              <span className="text-[10px] text-muted-foreground block">{formatPrice(p.priceMin)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Targeted Wishlist Dispatch Trigger */}
                  {wishlist.length > 0 && (
                    <div className="pt-4 border-t border-border/20 space-y-3 bg-secondary/5 p-4 rounded-2xl">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Trigger Wishlist Campaign</h4>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedWishlistCouponId}
                          onChange={(e) => setSelectedWishlistCouponId(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary text-foreground"
                        >
                          <option value="">No coupon attached</option>
                          {availableCoupons.map((c) => (
                            <option key={c.id} value={c.id}>{c.code} ({c.description})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomCampaignType("wishlist");
                            setCustomSubject("Items in your Snail Studios wishlist are waiting for you!");
                            setCustomBodyHtml(DEFAULT_WISHLIST_HTML);
                            setCustomCouponId(selectedWishlistCouponId);
                            setIsCustomCampaignModalOpen(true);
                          }}
                          className="bg-primary text-primary-foreground hover:bg-primary/95 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                        >
                          Send Email
                        </button>
                      </div>
                      {wishlistTriggerMessage && (
                        <p className="text-[10px] font-bold text-primary mt-1">{wishlistTriggerMessage}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Active Cart & Email Dispatch */}
                <div className="bg-card border border-border/30 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-border/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                      Active Shopping Cart ({cart.length} items)
                    </span>
                  </div>

                  {cart.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4">Shopping cart is currently empty.</p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {cart.map((item, idx) => (
                        <div key={idx} className="bg-secondary/15 border border-border/20 rounded-xl p-2.5 flex gap-3 items-center text-xs justify-between">
                          <div>
                            <h4 className="font-bold text-foreground">{item.name}</h4>
                            <span className="text-[10px] text-muted-foreground block">Size/Variant: {item.variantName}</span>
                          </div>
                          <div className="text-right shrink-0 font-semibold text-xs">
                            <span className="text-muted-foreground font-light">{item.quantity} &times; </span>
                            <span>{formatPrice(item.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Targeted Cart Dispatch Trigger */}
                  {cart.length > 0 && (
                    <div className="pt-4 border-t border-border/20 space-y-3 bg-secondary/5 p-4 rounded-2xl">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Trigger Abandoned Cart recovery</h4>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={selectedCartCouponId}
                          onChange={(e) => setSelectedCartCouponId(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary text-foreground"
                        >
                          <option value="">No coupon attached</option>
                          {availableCoupons.map((c) => (
                            <option key={c.id} value={c.id}>{c.code} ({c.description})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomCampaignType("cart");
                            setCustomSubject("Still thinking about your Snail Studios cart items?");
                            setCustomBodyHtml(DEFAULT_CART_HTML);
                            setCustomCouponId(selectedCartCouponId);
                            setIsCustomCampaignModalOpen(true);
                          }}
                          className="bg-primary text-primary-foreground hover:bg-primary/95 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                        >
                          Send Email
                        </button>
                      </div>
                      {cartTriggerMessage && (
                        <p className="text-[10px] font-bold text-primary mt-1">{cartTriggerMessage}</p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Row: Recently Viewed */}
              <div className="bg-card border border-border/30 rounded-3xl p-6 shadow-sm space-y-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Recently Viewed Products ({recentlyViewed.length})
                </span>
                
                {recentlyViewed.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-4">No recently viewed sets recorded.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {recentlyViewed.map((p) => {
                      const featuredImg = p.media && p.media.length > 0 ? p.media[0].media?.url : null;
                      return (
                        <div key={p.id} className="bg-secondary/15 border border-border/20 rounded-xl p-3 flex gap-3 items-center text-xs">
                          {featuredImg ? (
                            <img src={featuredImg} alt={p.name} className="w-10 h-10 rounded-lg object-cover border shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-secondary border flex items-center justify-center shrink-0">
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-foreground truncate">{p.name}</h4>
                            <span className="text-[10px] font-bold text-foreground block">{formatPrice(p.priceMin)}</span>
                          </div>
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

      {/* Customize & Preview Modal */}
      {isCustomCampaignModalOpen && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="bg-secondary/10 px-6 py-4 border-b border-border/40 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold font-serif text-foreground">
                  Customize & Preview Targeted {customCampaignType === "wishlist" ? "Wishlist" : "Cart"} Email
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Refine campaign copy details for {data?.customer?.name || "this customer"} before dispatching.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomCampaignModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Form & Editor */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Subject Line</label>
                  <input
                    type="text"
                    required
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full bg-secondary/10 border border-border/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-all text-foreground font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    Attach Coupon
                  </label>
                  <select
                    value={customCouponId}
                    onChange={(e) => setCustomCouponId(e.target.value)}
                    className="w-full bg-secondary/10 border border-border/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary transition-all text-foreground font-medium"
                  >
                    <option value="">No coupon attached</option>
                    {availableCoupons.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} ({c.description})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                    <span>Body HTML Content</span>
                    <span className="text-[9px] text-primary tracking-normal font-semibold lowercase font-sans">supports personalization tags</span>
                  </label>

                  {/* Smart Insertion Toolbar */}
                  <div className="flex flex-wrap gap-1 p-1 bg-secondary/15 border border-border/40 rounded-xl mb-1">
                    <span className="text-[9px] font-bold text-muted-foreground flex items-center px-1 select-none">
                      ⚡ Insert:
                    </span>
                    {[
                      { label: "👤 Name", tag: "{{customer_name}}", tooltip: "Customer Name" },
                      { label: "🎟️ Coupon", tag: "{{coupon_code}}", tooltip: "Coupon Code" },
                      customCampaignType === "wishlist"
                        ? { label: "❤️ Wishlist", tag: "{{wishlist_products}}", tooltip: "Wishlist products grid" }
                        : { label: "🛒 Cart", tag: "{{cart_products}}", tooltip: "Abandoned cart products list" },
                      { label: "🎟️ Coupon Block", tag: "{{coupon_block}}", tooltip: "Attaches a beautiful discount box" },
                    ].map((ph) => (
                      <button
                        key={ph.tag}
                        type="button"
                        title={ph.tooltip}
                        onClick={() => insertPlaceholderIntoModal(ph.tag)}
                        className="px-2 py-0.5 text-[9px] font-bold bg-background hover:bg-primary/5 hover:text-primary text-foreground border border-border/40 rounded-md transition-all hover:scale-[1.01]"
                      >
                        {ph.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative border border-border rounded-xl bg-background overflow-hidden min-h-[240px]">
                    {/* Highlight overlay layer */}
                    <div
                      ref={modalMirrorRef}
                      className="absolute inset-0 p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-all overflow-hidden text-transparent select-none"
                      style={{ wordBreak: "break-word" }}
                    >
                      {highlightPlaceholders(customBodyHtml)}
                    </div>

                    {/* Actual textarea */}
                    <textarea
                      ref={modalTextareaRef}
                      required
                      rows={10}
                      value={customBodyHtml}
                      onScroll={handleModalScroll}
                      onChange={(e) => setCustomBodyHtml(e.target.value)}
                      className="relative w-full bg-transparent p-3 font-mono text-[10px] leading-relaxed focus:outline-none focus:ring-0 focus:border-transparent transition-all text-foreground shadow-inner resize-y z-10"
                      style={{ wordBreak: "break-word", minHeight: "240px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Compiled Preview */}
              <div className="border border-border/40 rounded-2xl overflow-hidden bg-background shadow-sm flex flex-col h-[52vh] xl:sticky xl:top-2">
                <div className="bg-secondary/15 border-b border-border/40 px-4 py-2 flex justify-between items-center">
                  <span className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Eye size={12} className="text-primary" /> Live Email Preview
                  </span>
                  {/* Desktop/Mobile toggles */}
                  <div className="flex items-center border border-border/50 rounded-lg p-0.5 bg-secondary/10 scale-90">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("desktop")}
                      className={`px-2 py-1 rounded flex items-center gap-1 text-[9px] font-semibold transition-all ${
                        previewMode === "desktop" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Monitor size={10} /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("mobile")}
                      className={`px-2 py-1 rounded flex items-center gap-1 text-[9px] font-semibold transition-all ${
                        previewMode === "mobile" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Smartphone size={10} /> Mobile
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex justify-center py-4 bg-secondary/5 overflow-hidden">
                  <div
                    className={`transition-all duration-300 w-full flex justify-center ${
                      previewMode === "mobile" ? "max-w-[280px] border-[4px] border-secondary-foreground/20 rounded-[20px] p-1 bg-background" : "px-3"
                    }`}
                  >
                    <iframe
                      srcDoc={getCompiledPreview()}
                      title="Live Preview Sandbox"
                      className="w-full h-full border border-border/20 rounded-lg bg-white shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-secondary/10 px-6 py-4 border-t border-border/40 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCustomCampaignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-secondary/20 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isWishlistSending || isCartSending}
                onClick={customCampaignType === "wishlist" ? handleSendWishlistReminder : handleSendCartRecovery}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold shadow-md shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isWishlistSending || isCartSending ? (
                  "Sending..."
                ) : (
                  <>
                    <Send size={12} /> Send Custom Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
