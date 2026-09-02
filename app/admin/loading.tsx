import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-10">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-3 w-20 bg-[var(--color-navy)]/20 rounded" />
        <Skeleton className="mt-2 h-9 w-64 bg-[var(--color-sand)] rounded-lg" />
        <Skeleton className="mt-2 h-4 w-80 bg-[var(--color-sand)]/60 rounded" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 gap-6 divide-x divide-[var(--color-sand)] border-y border-[var(--color-sand)] py-6 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={i > 0 ? "pl-6 space-y-2" : "pl-0 space-y-2"}>
            <Skeleton className="h-3 w-16 bg-[var(--color-sand)]/60 rounded" />
            <Skeleton className="h-8 w-24 bg-[var(--color-sand)] rounded" />
            <Skeleton className="h-3 w-20 bg-[var(--color-sand)]/40 rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left column skeleton */}
        <div className="space-y-10 lg:col-span-2">
          {/* Table placeholder */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-32 bg-[var(--color-sand)] rounded" />
              <Skeleton className="h-4 w-24 bg-[var(--color-sand)]/60 rounded" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--color-sand)]/50 last:border-0">
                  <Skeleton className="h-4 w-20 bg-[var(--color-sand)] rounded" />
                  <Skeleton className="h-4 w-28 bg-[var(--color-sand)]/60 rounded" />
                  <Skeleton className="h-4 w-12 bg-[var(--color-sand)]/60 rounded" />
                  <Skeleton className="h-5 w-20 bg-[var(--color-sand)] rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Product list placeholder */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-40 bg-[var(--color-sand)] rounded" />
              <Skeleton className="h-4 w-20 bg-[var(--color-sand)]/60 rounded" />
            </div>
            <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] divide-y divide-[var(--color-sand)] overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <Skeleton className="h-12 w-12 rounded-xl bg-[var(--color-sand)] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40 bg-[var(--color-sand)] rounded" />
                    <Skeleton className="h-3 w-20 bg-[var(--color-sand)]/50 rounded" />
                  </div>
                  <Skeleton className="h-4 w-16 bg-[var(--color-sand)] rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column skeleton */}
        <div className="space-y-10">
          <div>
            <Skeleton className="h-4 w-32 bg-[var(--color-sand)] rounded mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
                  <Skeleton className="h-11 w-11 rounded-lg bg-[var(--color-sand)] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-24 bg-[var(--color-sand)] rounded" />
                    <Skeleton className="h-3 w-16 bg-[var(--color-sand)]/50 rounded" />
                  </div>
                  <Skeleton className="h-4 w-12 bg-[var(--color-sand)] rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
