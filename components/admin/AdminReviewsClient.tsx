"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Trash2,
  ExternalLink,
  MessageSquare,
  Search,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteReview } from "@/app/admin/reviews/actions";

export type AdminReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
  product: {
    id: string;
    name: string;
    slug: string;
    image: string;
  };
};

export function AdminReviewsClient({
  initialReviews,
}: {
  initialReviews: AdminReviewRow[];
}) {
  const [reviews, setReviews] = useState<AdminReviewRow[]>(initialReviews);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startTransition] = useTransition();

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (selectedRating !== "ALL" && r.rating !== parseInt(selectedRating)) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.product.name.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        (r.user.name && r.user.name.toLowerCase().includes(q)) ||
        (r.comment && r.comment.toLowerCase().includes(q))
      );
    });
  }, [reviews, searchQuery, selectedRating]);

  const handleDelete = (reviewId: string) => {
    startTransition(async () => {
      const res = await deleteReview(reviewId);
      if (res.success) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
            Moderation
          </span>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
            Product Reviews
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60">
            {reviews.length} customer reviews across catalog
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews by product, customer, or keywords..."
            className="h-10 pl-9 pr-4 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 text-xs text-[var(--color-navy)] focus:bg-white"
          />
        </div>

        <select
          value={selectedRating}
          onChange={(e) => setSelectedRating(e.target.value)}
          className="h-10 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 px-3 text-xs font-semibold text-[var(--color-navy)] cursor-pointer focus:bg-white"
        >
          <option value="ALL">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      {/* Reviews Table */}
      {filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-sand)] bg-white py-16 text-center shadow-xs">
          <MessageSquare className="h-12 w-12 text-[var(--color-navy)]/25 mb-3" />
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
            No reviews found
          </h3>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60 max-w-sm">
            {searchQuery
              ? `No reviews matching "${searchQuery}".`
              : "No customer reviews recorded yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-sand)] bg-white shadow-xs">
          <table className="w-full min-w-[550px] text-left">
            <thead>
              <tr className="border-b border-[var(--color-sand)] bg-stone-50/80 text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Rating &amp; Comment</th>
                <th className="px-6 py-3.5 text-right">Date</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/60">
              {filteredReviews.map((r) => (
                <tr
                  key={r.id}
                  className="group hover:bg-[var(--color-sand)]/15 transition-colors"
                >
                  {/* Product */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
                        <Image
                          src={r.product.image}
                          alt={r.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/products/${r.product.slug}`}
                          target="_blank"
                          className="font-bold text-xs text-[var(--color-navy)] hover:underline flex items-center gap-1 line-clamp-1"
                        >
                          <span>{r.product.name}</span>
                          <ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
                        </Link>
                      </div>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-4">
                    <p className="text-xs font-semibold text-[var(--color-navy)]">
                      {r.user.name || "Customer"}
                    </p>
                    <p className="text-[11px] text-[var(--color-navy)]/55 truncate">
                      {r.user.email}
                    </p>
                  </td>

                  {/* Rating & Comment */}
                  <td className="px-6 py-4 max-w-md">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < r.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-stone-300"
                          }`}
                        />
                      ))}
                      <span className="ml-1.5 text-xs font-bold text-[var(--color-navy)]">
                        {r.rating}.0
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-[var(--color-navy)]/80 leading-relaxed line-clamp-2">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4 text-right text-xs text-[var(--color-navy)]/60 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>

                  {/* Delete Action */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {deletingId === r.id ? (
                      <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-xl">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isDeleting}
                          onClick={() => handleDelete(r.id)}
                          className="h-6 px-2 text-[10px]"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Confirm Delete"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isDeleting}
                          onClick={() => setDeletingId(null)}
                          className="h-6 px-1.5 text-[10px] text-rose-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(r.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
