"use client";

import React, { useState, useEffect } from "react";
import { customConfirm, customAlert } from "@/components/ui/alert-dialog-provider";
import { 
  Star, 
  ShieldAlert, 
  Check, 
  Trash2, 
  X, 
  Loader2, 
  MessageSquare, 
  ThumbsUp, 
  Heart,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface ReviewItem {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  reviewerName: string | null;
  reviewerPhone: string | null;
  reviewerEmail: string | null;
  productName: string;
  isVerifiedPurchase?: boolean;
  images?: {
    id: string;
    url: string;
    altText: string | null;
  }[];
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<"all" | "approved" | "pending">("all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Lightbox States
  const [lightboxImages, setLightboxImages] = useState<{ url: string; altText: string | null }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null || lightboxImages.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + lightboxImages.length) % lightboxImages.length : null
        );
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % lightboxImages.length : null
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, lightboxImages]);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleToggleApproval = async (id: string, currentApprovedStatus: boolean) => {
    setIsUpdating(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !currentApprovedStatus }),
      });

      if (res.ok) {
        setReviews(prev =>
          prev.map(r => r.id === id ? { ...r, isApproved: !currentApprovedStatus } : r)
        );
        await customAlert("Error", "Failed to update review status.");
      }
    } catch (error) {
      console.error("Error toggling approval:", error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!await customConfirm("Delete Review", "Are you sure you want to permanently delete this product review? This cannot be undone.")) {
      return;
    }

    setIsUpdating(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setReviews(prev => prev.filter(r => r.id !== id));
        await customAlert("Error", "Failed to delete review.");
      }
    } catch (error) {
      console.error("Error deleting review:", error);
    } finally {
      setIsUpdating(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Star visualizer helper
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star 
            key={s} 
            className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-500 text-amber-500" : "text-border"}`} 
          />
        ))}
      </div>
    );
  };

  // Compute metrics
  const totalReviews = reviews.length;
  const pendingCount = reviews.filter(r => !r.isApproved).length;
  const approvedCount = reviews.filter(r => r.isApproved).length;
  const avgRating = totalReviews > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1) 
    : "0.0";

  // Filtered list
  const filteredReviews = reviews.filter((r) => {
    if (filterMode === "approved") return r.isApproved;
    if (filterMode === "pending") return !r.isApproved;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-card border border-border/40 rounded-3xl relative overflow-hidden transition-all duration-300">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none rounded-r-3xl" />
        <div className="space-y-1 relative z-10">
          <h1 className="font-serif text-2xl font-normal text-foreground">Feedback Moderation Queue</h1>
          <p className="text-xs text-muted-foreground font-light">
            Review shopper testimonials, approve ratings, and delete spam comments.
          </p>
        </div>
      </div>

      {/* Moderation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Feedbacks</span>
            <p className="font-serif text-xl font-semibold text-foreground">{totalReviews}</p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Approval</span>
            <p className="font-serif text-xl font-semibold text-foreground">{pendingCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Approved Feedbacks</span>
            <p className="font-serif text-xl font-semibold text-foreground">{approvedCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average Rating</span>
            <p className="font-serif text-xl font-semibold text-foreground">{avgRating} / 5.0</p>
          </div>
          <div className="p-3 rounded-2xl bg-secondary text-secondary-foreground flex items-center gap-1">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Queue Filter */}
      <div className="flex gap-1.5 bg-card border border-border/30 rounded-2xl p-4">
        {[
          { key: "all", label: "All Reviews" },
          { key: "pending", label: "Pending Moderation" },
          { key: "approved", label: "Approved / Live" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterMode(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              filterMode === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/40 hover:bg-secondary/70 text-muted-foreground border border-border/35"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Moderation Cards Queue */}
      {isLoading ? (
        <div className="py-24 text-center bg-card border border-border/40 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs font-light">Retrieving customer ratings queue...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="py-24 text-center bg-card border border-border/40 rounded-3xl shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-primary/10 text-primary rounded-full">
            <Star className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-xs">
            <h3 className="text-sm font-semibold tracking-wide">Queue Empty</h3>
            <p className="text-xs text-muted-foreground font-light leading-relaxed">
              No product reviews fit the selected moderation status filter.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReviews.map((review) => {
            const isRowUpdating = isUpdating === review.id;
            
            return (
              <div 
                key={review.id} 
                className="bg-card border border-border/40 rounded-3xl p-5.5 shadow-sm transition-all duration-300 hover:border-primary/20 flex flex-col md:flex-row md:items-start justify-between gap-6"
              >
                {/* Left content detail */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    {renderStars(review.rating)}
                    <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                      {review.rating} / 5
                    </span>
                    <span className="text-[10px] text-muted-foreground font-light">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">
                      Product: <span className="font-serif italic font-normal text-primary">{review.productName}</span>
                    </p>
                    {review.title && (
                      <h4 className="text-xs font-semibold text-foreground tracking-wide">
                        "{review.title}"
                      </h4>
                    )}
                    <p className="text-xs text-muted-foreground font-light leading-relaxed">
                      {review.comment || <span className="italic">No text description provided.</span>}
                    </p>

                    {/* Review Photos */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {review.images.map((img, idx) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => {
                              setLightboxImages(review.images || []);
                              setLightboxIndex(idx);
                            }}
                            className="relative w-12 h-12 rounded-lg overflow-hidden border border-border/40 hover:border-primary/40 transition-all cursor-pointer hover:scale-[1.03] duration-200 shrink-0 bg-secondary/10"
                          >
                            <img
                              src={img.url}
                              alt={img.altText || "Review photo"}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                   {/* Customer context info */}
                  <div className="pt-2.5 border-t border-border/20 flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] text-muted-foreground font-light items-center">
                    <span className="flex items-center gap-1 text-foreground font-medium">
                      Author: {review.reviewerName || "Shopper"}
                    </span>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 uppercase tracking-wider">
                        <Check className="w-3 h-3 shrink-0" /> Verified Purchase
                      </span>
                    )}
                    {review.reviewerPhone && (
                      <span className="font-mono">Phone: {review.reviewerPhone}</span>
                    )}
                    {review.reviewerEmail && (
                      <span className="font-mono">Email: {review.reviewerEmail}</span>
                    )}
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 md:self-stretch">
                  <button
                    disabled={isRowUpdating}
                    onClick={() => handleToggleApproval(review.id, review.isApproved)}
                    className={`w-full sm:w-28 px-4 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      review.isApproved 
                        ? "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                        : "bg-amber-500/10 hover:bg-amber-500/15 text-amber-500 border-amber-500/20"
                    }`}
                  >
                    {isRowUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : review.isApproved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Approve
                      </>
                    )}
                  </button>

                  <button
                    disabled={isRowUpdating}
                    onClick={() => handleDeleteReview(review.id)}
                    className="w-full sm:w-28 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal Overlay */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-150 bg-[#181311]/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-205">
          {/* Close Area / Click backdrop to close */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={() => setLightboxIndex(null)} />

          {/* Close Button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-primary/20 hover:bg-primary/30 text-primary-soft transition-all cursor-pointer z-10"
            aria-label="Close Lightbox"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Main Image Slider Container */}
          <div className="relative z-5 max-w-4xl max-h-[85vh] w-[90vw] flex items-center justify-center px-4">
            <img
              src={lightboxImages[lightboxIndex].url}
              alt={lightboxImages[lightboxIndex].altText || "Fullscreen review image"}
              className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
            />

            {/* Slide Navigation Counters */}
            <span className="absolute bottom-[-32px] left-1/2 -translate-x-1/2 text-xs font-semibold text-primary-soft/85 tracking-widest uppercase">
              {lightboxIndex + 1} / {lightboxImages.length}
            </span>

            {/* Left Nav Button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev !== null ? (prev - 1 + lightboxImages.length) % lightboxImages.length : null))}
                className="absolute left-2 sm:left-4 p-2 sm:p-3 rounded-full bg-primary/20 hover:bg-primary/35 text-primary-soft transition-all cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}

            {/* Right Nav Button */}
            {lightboxImages.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev !== null ? (prev + 1) % lightboxImages.length : null))}
                className="absolute right-2 sm:right-4 p-2 sm:p-3 rounded-full bg-primary/20 hover:bg-primary/35 text-primary-soft transition-all cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
