"use client";

import { useState, useTransition } from "react";
import { Star, MessageSquare, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitProductReview } from "@/app/(store)/products/[slug]/actions";

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface ProductReviewsSectionProps {
  productId: string;
  productSlug: string;
  isLoggedIn: boolean;
  reviews: ReviewItem[];
}

export function ProductReviewsSection({
  productId,
  productSlug,
  isLoggedIn,
  reviews,
}: ProductReviewsSectionProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalReviews = reviews.length;
  const avgRating = totalReviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;

  // Compute rating distribution counts (1 to 5 stars)
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    const percentage = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
    return { stars, count, percentage };
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const res = await submitProductReview({
        productId,
        productSlug,
        rating,
        comment,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to submit review.");
      } else {
        setSuccessMessage("Thank you! Your review has been published.");
        setComment("");
      }
    });
  }

  return (
    <section className="mt-20 border-t border-[var(--color-sand)]/70 pt-16">
      {/* Section Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-navy)]/55">
            CUSTOMER FEEDBACK
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--color-navy)] mt-1">
            Ratings & Reviews
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Overall Score & Star Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-6 shadow-2xs">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-extrabold text-[var(--color-navy)] font-[family-name:var(--font-display)]">
                {avgRating > 0 ? avgRating.toFixed(1) : "0.0"}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(avgRating)
                          ? "fill-amber-400 text-amber-500"
                          : "text-[var(--color-sand)]"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[var(--color-navy)]/60 mt-1 font-medium">
                  Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>

            {/* Rating Bars */}
            <div className="mt-6 space-y-2 border-t border-[var(--color-sand)]/60 pt-4">
              {distribution.map(({ stars, count, percentage }) => (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 w-12 font-semibold text-[var(--color-navy)]">
                    <span>{stars}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-[var(--color-sand)]/50 overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-navy)] transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-[var(--color-navy)]/50 font-medium">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Review Submission Form Container */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-6 shadow-2xs">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-navy)] mb-4">
              Write a Review
            </h3>

            {!isLoggedIn ? (
              <div className="text-xs text-[var(--color-navy)]/70 py-3">
                Please{" "}
                <a
                  href={`/login?callbackUrl=/products/${productSlug}`}
                  className="font-bold text-[var(--color-navy)] underline hover:text-[var(--color-sky)]"
                >
                  sign in
                </a>{" "}
                to share your thoughts on this shoe.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Star Picker */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-navy)]/70 mb-1.5">
                    Your Rating
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setRating(star)}
                        className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= (hoverRating ?? rating)
                              ? "fill-amber-400 text-amber-500"
                              : "text-[var(--color-sand)] hover:text-amber-300"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-[var(--color-navy)]">
                      {hoverRating ?? rating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Comment Input */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-navy)]/70 mb-1.5">
                    Your Review (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="How does this shoe fit? Share details about comfort, quality, and style..."
                    className="w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream)] p-3 text-xs text-[var(--color-navy)] placeholder:[var(--color-navy)]/40 focus:border-[var(--color-navy)]/40 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                {errorMessage && (
                  <p className="text-xs font-medium text-rose-600">{errorMessage}</p>
                )}
                {successMessage && (
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {successMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl h-10 text-xs font-semibold bg-[var(--color-navy)] text-[var(--color-cream)] hover:bg-[var(--color-navy)]/90 shadow-2xs"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                    </span>
                  ) : (
                    "Submit Review"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Customer Reviews Feed */}
        <div className="lg:col-span-7 space-y-4">
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/60 py-16 px-6 text-center">
              <MessageSquare className="h-8 w-8 text-[var(--color-navy)]/30 mb-3" />
              <p className="text-sm font-semibold text-[var(--color-navy)]">
                No reviews yet
              </p>
              <p className="text-xs text-[var(--color-navy)]/50 mt-1 max-w-sm">
                Be the first customer to leave a review for this product!
              </p>
            </div>
          ) : (
            reviews.map((rev) => {
              const reviewerName =
                rev.user?.name || rev.user?.email?.split("@")[0] || "Verified Buyer";
              return (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-navy)]">
                        {reviewerName}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--color-navy)]/40 font-medium">
                      {new Date(rev.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          star <= rev.rating
                            ? "fill-amber-400 text-amber-500"
                            : "text-[var(--color-sand)]"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  {rev.comment && (
                    <p className="text-xs text-[var(--color-navy)]/80 leading-relaxed pt-1">
                      {rev.comment}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
