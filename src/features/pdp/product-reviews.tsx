"use client";

import React, { useState, useMemo } from "react";
import { Star, MessageSquare, Check, AlertTriangle, ShieldCheck, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { submitProductReview } from "./actions";

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: Date;
  reviewerName: string;
  isVerifiedPurchase: boolean;
}

export interface ReviewEligibility {
  isLoggedIn: boolean;
  hasPurchased: boolean;
  isDelivered: boolean;
  isEligible: boolean;
  remainingMinutes: number;
}

interface ProductReviewsProps {
  productId: string;
  reviews: ReviewItem[];
  averageRating: number;
  reviewCount: number;
  eligibility: ReviewEligibility;
}

export function ProductReviews({
  productId,
  reviews,
  averageRating,
  reviewCount,
  eligibility,
}: ProductReviewsProps) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Compute star breakdown percentages
  const ratingDistribution = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviews.length === 0) return distribution;

    for (const r of reviews) {
      const rate = Math.round(r.rating) as 5 | 4 | 3 | 2 | 1;
      if (distribution[rate] !== undefined) {
        distribution[rate]++;
      }
    }
    return distribution;
  }, [reviews]);

  const ratingPercentages = useMemo(() => {
    const total = reviews.length;
    const percentages = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (total === 0) return percentages;

    for (const key of [5, 4, 3, 2, 1] as const) {
      percentages[key] = Math.round((ratingDistribution[key] / total) * 100);
    }
    return percentages;
  }, [reviews, ratingDistribution]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const res = await submitProductReview(productId, rating, title, comment);
      if (res.success) {
        setSubmitSuccess(true);
        setTitle("");
        setComment("");
        setRating(5);
      } else {
        setSubmitError(res.error || "Failed to submit review.");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 border-t border-border/30">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header Title */}
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h2 className="font-serif text-2xl font-normal text-foreground">
            Customer Reviews
          </h2>
        </div>

        {/* 1. Aggregated Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[35fr_65fr] gap-8 p-6 md:p-8 rounded-3xl bg-secondary/15 border border-border/30">
          
          {/* Rating Summary Score */}
          <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-border/20">
            <span className="font-serif text-5xl font-medium text-foreground tracking-tight">
              {averageRating.toFixed(1)}
            </span>
            <div className="flex items-center gap-1 mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "w-4 h-4 transition-colors",
                    star <= Math.round(averageRating)
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground font-light mt-3 leading-relaxed">
              Based on {reviewCount} approved review{reviewCount !== 1 && "s"}
            </p>
          </div>

          {/* Star Distribution Breakdown Bars */}
          <div className="flex flex-col justify-center gap-2.5 p-4">
            {([5, 4, 3, 2, 1] as const).map((star) => (
              <div key={star} className="flex items-center gap-3 w-full">
                <span className="text-[11px] font-semibold text-muted-foreground w-6 text-right shrink-0">
                  {star} ★
                </span>
                <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${ratingPercentages[star]}%` }}
                  />
                </div>
                <span className="text-[11px] font-light text-muted-foreground w-10 text-right shrink-0">
                  {ratingPercentages[star]}%
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* 2. Write a Review Toggle & Verification */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 border border-border hover:border-primary hover:text-primary transition-all duration-200 text-xs font-semibold uppercase tracking-widest rounded-full cursor-pointer bg-card text-foreground"
            >
              {showForm ? "Close Form" : "Write a Review"}
            </button>
          </div>

          {showForm && (
            <div className="p-6 rounded-3xl bg-secondary/10 border border-border/30 max-w-2xl mx-auto animate-in fade-in duration-300">
              
              {/* Submission Status Message / Checks */}
              {submitSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Review Submitted!</h4>
                  <p className="text-xs text-muted-foreground font-light max-w-sm mx-auto leading-relaxed">
                    Thank you for your feedback! Your review has been submitted and is currently awaiting moderation/approval before publication.
                  </p>
                </div>
              ) : !eligibility.isLoggedIn ? (
                <div className="text-center py-4 space-y-2">
                  <User className="w-8 h-8 text-muted-foreground/60 mx-auto" />
                  <p className="text-xs text-muted-foreground font-light">
                    Please sign in to write a review. Only verified buyers can submit product reviews.
                  </p>
                  <a
                    href="/admin"
                    className="inline-block text-xs font-bold text-primary hover:underline pt-2 uppercase tracking-wider"
                  >
                    Go to Authentication
                  </a>
                </div>
              ) : !eligibility.hasPurchased ? (
                <div className="text-center py-4 space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-500/80 mx-auto" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Verified Buyer Only</h4>
                  <p className="text-xs text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
                    You can only write a review for products you have purchased. Buy this item to share your feedback!
                  </p>
                </div>
              ) : !eligibility.isDelivered ? (
                <div className="text-center py-4 space-y-2">
                  <Clock className="w-8 h-8 text-amber-500/80 mx-auto" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Order Not Delivered</h4>
                  <p className="text-xs text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
                    Your order contains this product but has not been marked as delivered yet. You can submit a review once your package is delivered.
                  </p>
                </div>
              ) : !eligibility.isEligible ? (
                <div className="text-center py-6 space-y-3">
                  <Clock className="w-10 h-10 text-primary mx-auto animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Delivery Validation Pending</h4>
                  <p className="text-xs text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
                    Your package was recently delivered! For quality control, reviews are locked until <strong>2 hours after delivery</strong>.
                  </p>
                  <p className="text-[11px] text-primary font-semibold">
                    Please try again in about {eligibility.remainingMinutes} minute{eligibility.remainingMinutes !== 1 && "s"}.
                  </p>
                </div>
              ) : (
                /* Write Review Form Block */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-serif text-lg font-normal text-foreground text-center mb-4">
                    Share Your Feedback
                  </h3>

                  {/* Rating Selector */}
                  <div className="space-y-1.5 flex flex-col items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Select Rating
                    </label>
                    <div className="flex items-center gap-1.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setRating(star)}
                          className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            className={cn(
                              "w-6 h-6 transition-colors",
                              star <= (hoverRating ?? rating)
                                ? "fill-primary text-primary"
                                : "text-muted-foreground/30"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Review Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Absolutely beautiful set! Fits perfectly"
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60 transition-all font-light"
                    />
                  </div>

                  {/* Comment input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Review Body
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us about the application, fit, durability, and style..."
                      className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60 transition-all font-light leading-relaxed resize-none"
                    />
                  </div>

                  {submitError && (
                    <p className="text-xs text-destructive font-medium text-center">{submitError}</p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* 3. Review Lists Block */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-secondary/5 border border-border/10">
              <p className="text-xs text-muted-foreground font-light">
                No reviews yet. Be the first to share your experience with this set!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const initials = review.reviewerName
                  ? review.reviewerName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : "S";

                return (
                  <div
                    key={review.id}
                    className="p-6 rounded-3xl bg-card border border-border/30 flex flex-col gap-4 hover:border-primary/20 transition-all duration-300"
                  >
                    {/* Review Header: User Info & Verification */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        {/* User Avatar Circle */}
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-serif shrink-0">
                          {initials.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {review.reviewerName || "Verified Buyer"}
                          </p>
                          {review.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-wider">
                              <ShieldCheck className="w-3.5 h-3.5" /> Verified Purchase
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <span className="text-[10px] text-muted-foreground font-light">
                        {new Date(review.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Review Body */}
                    <div className="space-y-2">
                      {/* Rating Stars */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "w-3.5 h-3.5",
                              star <= review.rating
                                ? "fill-primary text-primary"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>

                      {/* Review Title & Content */}
                      {review.title && (
                        <h4 className="text-xs font-bold text-foreground leading-tight tracking-wide">
                          {review.title}
                        </h4>
                      )}
                      <p className="text-xs text-muted-foreground leading-loose font-light font-sans whitespace-pre-wrap">
                        {review.comment}
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
