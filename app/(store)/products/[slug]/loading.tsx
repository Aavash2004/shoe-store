import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center gap-2 mb-8">
        <Skeleton className="h-4 w-12 bg-[var(--color-sand)] rounded" />
        <span className="text-[var(--color-sand)]">/</span>
        <Skeleton className="h-4 w-16 bg-[var(--color-sand)] rounded" />
        <span className="text-[var(--color-sand)]">/</span>
        <Skeleton className="h-4 w-32 bg-[var(--color-sand)] rounded" />
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left Column: Image Gallery Skeleton */}
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-3xl bg-[var(--color-sand)]/70 border border-[var(--color-sand)]" />
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-20 w-20 rounded-xl bg-[var(--color-sand)] border border-[var(--color-sand)] shrink-0"
              />
            ))}
          </div>
        </div>

        {/* Right Column: Details & Buy Actions Skeleton */}
        <div className="space-y-6">
          <div>
            <Skeleton className="h-4 w-24 bg-[var(--color-sand)]/60 rounded" />
            <Skeleton className="mt-2 h-9 w-3/4 bg-[var(--color-sand)] rounded-lg" />
            <Skeleton className="mt-3 h-8 w-28 bg-[var(--color-sand)] rounded-md" />
          </div>

          <Skeleton className="h-20 w-full bg-[var(--color-cream-alt)] rounded-2xl border border-[var(--color-sand)]" />

          {/* Color selector skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 bg-[var(--color-sand)] rounded" />
            <div className="flex gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-20 bg-[var(--color-sand)] rounded-xl" />
              ))}
            </div>
          </div>

          {/* Size selector skeleton */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20 bg-[var(--color-sand)] rounded" />
              <Skeleton className="h-4 w-16 bg-[var(--color-sand)]/60 rounded" />
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-[var(--color-sand)] rounded-xl" />
              ))}
            </div>
          </div>

          {/* Action buttons skeleton */}
          <div className="pt-4 space-y-3">
            <Skeleton className="h-14 w-full bg-[var(--color-navy)]/30 rounded-2xl" />
            <Skeleton className="h-12 w-full bg-[var(--color-sand)] rounded-2xl" />
          </div>

          {/* Highlights / Features skeleton */}
          <div className="border-t border-[var(--color-sand)] pt-6 space-y-3">
            <Skeleton className="h-4 w-36 bg-[var(--color-sand)] rounded" />
            <Skeleton className="h-4 w-full bg-[var(--color-sand)]/50 rounded" />
            <Skeleton className="h-4 w-5/6 bg-[var(--color-sand)]/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
