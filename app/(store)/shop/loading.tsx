import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-[var(--color-sand)] pb-6">
        <div>
          <Skeleton className="h-4 w-24 bg-[var(--color-sand)]/60 rounded" />
          <Skeleton className="mt-2 h-9 w-64 bg-[var(--color-sand)] rounded-lg" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full bg-[var(--color-sand)]/50 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 bg-[var(--color-sand)] rounded-xl" />
          <Skeleton className="h-10 w-44 bg-[var(--color-sand)] rounded-xl" />
        </div>
      </div>

      {/* Main layout with sidebar filters & product grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Filter sidebar skeleton */}
        <div className="hidden lg:block space-y-6">
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--color-sand)] pb-4">
              <Skeleton className="h-5 w-20 bg-[var(--color-sand)] rounded" />
              <Skeleton className="h-4 w-12 bg-[var(--color-sand)]/60 rounded" />
            </div>

            {/* Categories filter skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 bg-[var(--color-sand)] rounded" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 bg-[var(--color-sand)] rounded" />
                  <Skeleton className="h-4 w-28 bg-[var(--color-sand)]/60 rounded" />
                </div>
              ))}
            </div>

            {/* Price slider skeleton */}
            <div className="space-y-3 pt-4 border-t border-[var(--color-sand)]">
              <Skeleton className="h-4 w-24 bg-[var(--color-sand)] rounded" />
              <Skeleton className="h-2 w-full bg-[var(--color-sand)] rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12 bg-[var(--color-sand)]/60 rounded" />
                <Skeleton className="h-4 w-12 bg-[var(--color-sand)]/60 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Product Cards Grid skeleton */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-4 space-y-4"
              >
                {/* Image box skeleton */}
                <Skeleton className="aspect-square w-full rounded-xl bg-[var(--color-sand)]/70" />

                {/* Title & Brand */}
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 bg-[var(--color-sand)]/60 rounded" />
                  <Skeleton className="h-5 w-3/4 bg-[var(--color-sand)] rounded" />
                </div>

                {/* Price and Add button */}
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-6 w-20 bg-[var(--color-sand)] rounded" />
                  <Skeleton className="h-9 w-9 rounded-full bg-[var(--color-sand)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
