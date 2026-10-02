import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 animate-pulse">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        {/* Left Column: Product Gallery Skeleton (Matching ProductGallery: vertical thumbs on desktop, aspect-square main image) */}
        <div className="flex flex-col-reverse md:flex-row gap-4 w-full">
          {/* Thumbnails strip */}
          <div className="flex flex-row md:flex-col gap-2.5 shrink-0 py-1">
            {[...Array(4)].map((_, idx) => (
              <Skeleton
                key={idx}
                className="h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-sm bg-[var(--color-sand)]/70 border border-[var(--color-sand)]"
              />
            ))}
          </div>

          {/* Main Image Viewport */}
          <div className="relative flex-1 aspect-square overflow-hidden rounded-sm border border-[var(--color-sand)]/80 bg-[var(--color-cream-alt)]">
            <Skeleton className="h-full w-full rounded-none bg-[var(--color-sand)]/40" />
          </div>
        </div>

        {/* Right Column: Product Info & Buy Box (Matching ProductDetailInteractive) */}
        <div className="flex flex-col">
          {/* Brand & Category */}
          <Skeleton className="h-3.5 w-32 bg-[var(--color-sand)]/60 rounded" />

          {/* Title */}
          <Skeleton className="mt-2 h-9 w-3/4 bg-[var(--color-sand)] rounded-lg md:h-10" />

          {/* Price */}
          <div className="mt-4">
            <Skeleton className="h-8 w-28 bg-[var(--color-sand)] rounded" />
          </div>

          {/* Description */}
          <div className="mt-6 max-w-md space-y-2">
            <Skeleton className="h-4 w-full bg-[var(--color-sand)]/60 rounded" />
            <Skeleton className="h-4 w-5/6 bg-[var(--color-sand)]/60 rounded" />
          </div>

          {/* Color selector */}
          <div className="mt-10 space-y-3">
            <Skeleton className="h-4 w-16 bg-[var(--color-sand)] rounded" />
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-20 bg-[var(--color-sand)]/60 rounded-md" />
              ))}
            </div>
          </div>

          {/* Size selector */}
          <div className="mt-8 space-y-3.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-[var(--color-sand)] rounded" />
              <Skeleton className="h-4 w-28 bg-[var(--color-sand)]/60 rounded" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-[var(--color-sand)]/50 rounded-md" />
              ))}
            </div>
          </div>

          {/* Add to Cart & Wishlist Buttons */}
          <div className="mt-8 flex items-center gap-3">
            <Skeleton className="h-12 flex-1 bg-[var(--color-navy)]/30 rounded-xl" />
            <Skeleton className="h-12 w-12 bg-[var(--color-sand)]/60 rounded-xl shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

