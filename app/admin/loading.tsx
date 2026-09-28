import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-3 w-28 bg-[var(--color-navy)]/20 rounded" />
          <Skeleton className="mt-2 h-9 w-64 bg-[var(--color-sand)] rounded-xl" />
          <Skeleton className="mt-2 h-4 w-72 bg-[var(--color-sand)]/60 rounded" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-28 bg-[var(--color-sand)]/70 rounded-full" />
          <Skeleton className="h-10 w-32 bg-[var(--color-sand)] rounded-xl" />
        </div>
      </div>

      {/* Stats row with clear full border */}
      <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-4 sm:p-6 shadow-2xs">
        <div className="grid grid-cols-2 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-sand)] sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={i > 0 ? "pt-4 sm:pt-0 sm:pl-6 space-y-2.5" : "space-y-2.5"}>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20 bg-[var(--color-sand)]/60 rounded" />
                <Skeleton className="h-7 w-7 rounded-lg bg-[var(--color-sand)]/40" />
              </div>
              <Skeleton className="h-8 w-28 bg-[var(--color-sand)] rounded-lg" />
              <Skeleton className="h-3 w-24 bg-[var(--color-sand)]/40 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Main 2-column grid: LEFT is Low Stock (lg:col-span-1), RIGHT is Activity (lg:col-span-2) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Low Stock Alerts & Quick Actions (1 col) */}
        <div className="space-y-8 lg:col-span-1">
          {/* Low Stock Skeleton Card */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 bg-[var(--color-sand)] rounded" />
              <Skeleton className="h-4 w-16 bg-[var(--color-sand)]/60 rounded" />
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--color-sand)]/30">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-6 flex-1 rounded-lg bg-[var(--color-sand)]/60" />
              ))}
            </div>
            {/* Stock item list */}
            <div className="space-y-2.5 pt-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--color-sand)]/50 bg-white/40">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-32 bg-[var(--color-sand)] rounded" />
                    <Skeleton className="h-3 w-20 bg-[var(--color-sand)]/50 rounded" />
                  </div>
                  <Skeleton className="h-6 w-14 rounded-full bg-[var(--color-sand)]" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Skeleton */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 space-y-3 shadow-2xs">
            <Skeleton className="h-4 w-28 bg-[var(--color-sand)] rounded mb-3" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl bg-[var(--color-sand)]/50" />
            ))}
          </div>
        </div>

        {/* Right Column: Recent Orders & Catalog Activity (2 cols) */}
        <div className="space-y-8 lg:col-span-2">
          {/* Recent Orders Card */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36 bg-[var(--color-sand)] rounded" />
              <Skeleton className="h-4 w-20 bg-[var(--color-sand)]/60 rounded" />
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-[var(--color-sand)]/60 last:border-0">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24 bg-[var(--color-sand)] rounded" />
                    <Skeleton className="h-3 w-32 bg-[var(--color-sand)]/50 rounded" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-16 bg-[var(--color-sand)] rounded" />
                    <Skeleton className="h-6 w-20 rounded-full bg-[var(--color-sand)]/70" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Products Card */}
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36 bg-[var(--color-sand)] rounded" />
              <Skeleton className="h-4 w-20 bg-[var(--color-sand)]/60 rounded" />
            </div>
            <div className="divide-y divide-[var(--color-sand)]/60">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-12 w-12 rounded-xl bg-[var(--color-sand)] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40 bg-[var(--color-sand)] rounded" />
                    <Skeleton className="h-3 w-24 bg-[var(--color-sand)]/50 rounded" />
                  </div>
                  <Skeleton className="h-4 w-16 bg-[var(--color-sand)] rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
