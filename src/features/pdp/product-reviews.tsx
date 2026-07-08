"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Star, 
  MessageSquare, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  User, 
  UploadCloud, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon, 
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitProductReview, getReviewImageUploadSignature, checkReviewEligibility } from "./actions";
import CloudinaryImage from "@/components/media/cloudinary-image";

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: Date;
  reviewerName: string;
  isVerifiedPurchase: boolean;
  images?: {
    id: string;
    url: string;
    altText: string | null;
  }[];
}

export interface ReviewEligibility {
  isLoggedIn: boolean;
  hasPurchased: boolean;
  isDelivered: boolean;
  isEligible: boolean;
  remainingMinutes: number;
}

function ReviewFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse w-full max-w-lg mx-auto py-4">
      {/* Title skeleton */}
      <div className="h-6 bg-secondary/40 rounded w-1/2 mx-auto" />

      {/* Star Selector skeleton */}
      <div className="flex flex-col items-center space-y-2">
        <div className="h-3.5 bg-secondary/30 rounded w-1/4" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-7 h-7 bg-secondary/30 rounded-full" />
          ))}
        </div>
      </div>

      {/* Review Title Input skeleton */}
      <div className="space-y-2">
        <div className="h-3.5 bg-secondary/30 rounded w-1/5" />
        <div className="h-10 bg-secondary/20 rounded-xl w-full" />
      </div>

      {/* Review Comment Textarea skeleton */}
      <div className="space-y-2">
        <div className="h-3.5 bg-secondary/30 rounded w-1/4" />
        <div className="h-28 bg-secondary/20 rounded-xl w-full" />
      </div>

      {/* Review Photos Upload skeleton */}
      <div className="space-y-2">
        <div className="h-3.5 bg-secondary/30 rounded w-1/3" />
        <div className="h-16 bg-secondary/20 rounded-xl w-24" />
      </div>

      {/* Submit Button skeleton */}
      <div className="h-11 bg-secondary/40 rounded-full w-full mt-4" />
    </div>
  );
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

  // Photo Reviews States
  const [uploadedImages, setUploadedImages] = useState<{
    url: string;
    publicId: string;
    fileName?: string;
    fileSize?: number;
    format?: string;
    width?: number;
    height?: number;
  }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{ [fileName: string]: number }>({});

  // Lightbox States
  const [lightboxImages, setLightboxImages] = useState<{ url: string; altText: string | null }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Show All / Limit reviews State
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [currentEligibility, setCurrentEligibility] = useState<ReviewEligibility>(eligibility);
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadEligibility() {
      try {
        const res = await checkReviewEligibility(productId);
        if (isMounted) {
          setCurrentEligibility(res);
          setIsLoadingEligibility(false);
        }
      } catch (err) {
        console.error("Failed to load review eligibility:", err);
        if (isMounted) {
          setIsLoadingEligibility(false);
        }
      }
    }
    loadEligibility();
    return () => {
      isMounted = false;
    };
  }, [productId]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError("");

    const remainingSlots = 5 - uploadedImages.length;
    if (files.length > remainingSlots) {
      setUploadError(`You can only upload up to 5 images. You have ${remainingSlots} slots remaining.`);
      return;
    }

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith("image/")) {
          throw new Error(`File "${file.name}" is not an image.`);
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds 5MB size limit.`);
        }

        // Initialize progress
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const signRes = await getReviewImageUploadSignature();
        if (!signRes.success) {
          throw new Error(signRes.error || "Failed to generate upload signature.");
        }

        const signature = signRes.signature;
        const apiKey = signRes.apiKey;
        const timestamp = signRes.timestamp;
        const folder = signRes.folder;
        const uploadPreset = signRes.uploadPreset;
        const cloudName = signRes.cloudName;

        const cloudData = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append("file", file);
          formData.append("api_key", apiKey);
          formData.append("timestamp", timestamp.toString());
          formData.append("signature", signature);
          formData.append("folder", folder);
          if (uploadPreset) {
            formData.append("upload_preset", uploadPreset);
          }

          xhr.upload.addEventListener("progress", (evt) => {
            if (evt.lengthComputable) {
              const percentComplete = Math.round((evt.loaded / evt.total) * 100);
              setUploadProgress((prev) => ({
                ...prev,
                [file.name]: percentComplete,
              }));
            }
          });

          xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch {
                reject(new Error("Failed to parse Cloudinary response."));
              }
            } else {
              try {
                const errResponse = JSON.parse(xhr.responseText);
                reject(new Error(errResponse.error?.message || "Failed to upload image."));
              } catch {
                reject(new Error("Failed to upload image."));
              }
            }
          };

          xhr.onerror = () => reject(new Error("Network upload error."));
          xhr.onabort = () => reject(new Error("Upload aborted."));

          xhr.send(formData);
        });

        setUploadedImages((prev) => [
          ...prev,
          {
            url: cloudData.secure_url,
            publicId: cloudData.public_id,
            fileName: file.name,
            fileSize: cloudData.bytes,
            format: cloudData.format,
            width: cloudData.width,
            height: cloudData.height,
          },
        ]);

        // Remove from progress list upon success
        setUploadProgress((prev) => {
          const copy = { ...prev };
          delete copy[file.name];
          return copy;
        });
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Something went wrong during image upload.");
      setUploadProgress({});
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

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
    if (isUploading) {
      setSubmitError("Please wait for images to finish uploading before submitting.");
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const res = await submitProductReview(productId, rating, title, comment, uploadedImages);
      if (res.success) {
        setSubmitSuccess(true);
        setTitle("");
        setComment("");
        setRating(5);
        setUploadedImages([]);
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
              {isLoadingEligibility ? (
                <ReviewFormSkeleton />
              ) : submitSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Review Submitted!</h4>
                  <p className="text-xs text-muted-foreground font-light max-w-sm mx-auto leading-relaxed">
                    Thank you for your feedback! Your review has been submitted and is currently awaiting moderation/approval before publication.
                  </p>
                </div>
              ) : !currentEligibility.isLoggedIn ? (
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
              ) : !currentEligibility.hasPurchased ? (
                <div className="text-center py-4 space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-500/80 mx-auto" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Verified Buyer Only</h4>
                  <p className="text-xs text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
                    You can only write a review for products you have purchased. Buy this item to share your feedback!
                  </p>
                </div>
              ) : !currentEligibility.isDelivered ? (
                <div className="text-center py-4 space-y-2">
                  <Clock className="w-8 h-8 text-amber-500/80 mx-auto" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Order Not Delivered</h4>
                  <p className="text-xs text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
                    Your order contains this product but has not been marked as delivered yet. You can submit a review once your package is delivered.
                  </p>
                </div>
              ) : !currentEligibility.isEligible ? (
                <div className="text-center py-6 space-y-3">
                  <Clock className="w-10 h-10 text-primary mx-auto animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Delivery Validation Pending</h4>
                  <p className="text-xs text-muted-foreground font-light max-w-md mx-auto leading-relaxed">
                    Your package was recently delivered! For quality control, reviews are locked until <strong>2 hours after delivery</strong>.
                  </p>
                  <p className="text-[11px] text-primary font-semibold">
                    Please try again in about {currentEligibility.remainingMinutes} minute{currentEligibility.remainingMinutes !== 1 && "s"}.
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
                  </div>                  {/* Photo Upload Zone */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Attach Photos (Optional, max 5)
                    </label>

                    {/* Previews & Upload Progress Grid */}
                    {(uploadedImages.length > 0 || Object.keys(uploadProgress).length > 0) && (
                      <div className="flex flex-col gap-3 mb-3">
                        {/* Uploaded Images Previews */}
                        {uploadedImages.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {uploadedImages.map((img, index) => (
                              <div key={img.publicId} className="relative w-18 h-18 rounded-xl overflow-hidden border border-border bg-secondary/10 group shrink-0">
                                 <CloudinaryImage
                                   src={img.url}
                                   variant="thumbnail"
                                   alt="preview"
                                   className="w-full h-full"
                                 />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveUploadedImage(index)}
                                  className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 hover:bg-rose-500 hover:text-white transition-all text-muted-foreground cursor-pointer flex items-center justify-center"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Uploading Files Progress Bars */}
                        {Object.entries(uploadProgress).map(([fileName, progress]) => (
                          <div key={fileName} className="w-full bg-secondary/15 rounded-2xl p-3 border border-border/20 flex flex-col gap-1.5 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground">
                              <span className="truncate max-w-[70%]">{fileName}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-secondary/40 overflow-hidden relative">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload button zone */}
                    {uploadedImages.length < 5 && (
                      <div className="relative">
                        <input
                          type="file"
                          id="review-image-upload"
                          multiple
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={isUploading}
                          className="hidden"
                        />
                        <label
                          htmlFor="review-image-upload"
                          className={cn(
                            "w-full py-4 border border-dashed border-border hover:border-primary rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all bg-card text-muted-foreground hover:text-primary",
                            isUploading && "pointer-events-none opacity-50"
                          )}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              <span className="text-[10px] font-medium tracking-wide">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-5 h-5" />
                              <span className="text-[10px] font-medium tracking-wide">Upload JPEG, PNG or WEBP (Max 5MB)</span>
                            </>
                          )}
                        </label>
                      </div>
                    )}

                    {uploadError && (
                      <p className="text-[11px] text-destructive text-center font-medium mt-1">{uploadError}</p>
                    )}
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
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => {
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

                      {/* Review Photos */}
                      {review.images && review.images.length > 0 && (
                        <div className="flex flex-wrap gap-2.5 pt-3">
                          {review.images.map((img, idx) => (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => {
                                setLightboxImages(review.images || []);
                                setLightboxIndex(idx);
                              }}
                              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border/40 hover:border-primary/40 transition-all cursor-pointer hover:scale-[1.03] duration-200 shrink-0 bg-secondary/10"
                            >
                               <CloudinaryImage
                                 src={img.url}
                                 variant="thumbnail"
                                 alt={img.altText || "Review photo"}
                                 className="w-full h-full"
                               />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}

              {/* Show All Toggle Button */}
              {reviews.length > 3 && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="px-6 py-3 border border-border hover:border-primary hover:text-primary transition-all duration-200 text-xs font-semibold uppercase tracking-widest rounded-full cursor-pointer bg-card text-foreground font-sans"
                  >
                    {showAllReviews ? "Show Less" : `Show All Reviews (${reviews.length})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 4. Lightbox Modal Overlay */}
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
            <CloudinaryImage
              src={lightboxImages[lightboxIndex].url}
              variant="zoom"
              alt={lightboxImages[lightboxIndex].altText || "Fullscreen review image"}
              className="max-w-full h-[80vh] w-[90vw]"
              objectFit="contain"
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
