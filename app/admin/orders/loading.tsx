import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header & Operational Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24 rounded bg-[var(--color-navy)]/20" />
            <Skeleton className="h-5 w-20 rounded-full bg-emerald-100" />
          </div>
          <Skeleton className="mt-2 h-9 w-44 rounded-xl bg-[var(--color-sand)]" />
          <Skeleton className="mt-2 h-4 w-72 rounded bg-[var(--color-sand)]/60" />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-10 w-32 rounded-xl bg-[var(--color-sand)]/60" />
          <Skeleton className="h-10 w-24 rounded-xl bg-[var(--color-sand)]/60" />
          <Skeleton className="h-10 w-28 rounded-xl bg-[var(--color-sand)]" />
        </div>
      </div>

      {/* 6-Card KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--color-sand)] bg-white p-3.5 space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 rounded bg-[var(--color-sand)]/60" />
              <Skeleton className="h-3.5 w-3.5 rounded bg-[var(--color-sand)]/40" />
            </div>
            <Skeleton className="h-7 w-12 rounded-lg bg-[var(--color-sand)]" />
            <Skeleton className="h-2.5 w-20 rounded bg-[var(--color-sand)]/40" />
          </div>
        ))}
      </div>

      {/* Search and Tabs Row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Status Tabs skeleton */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-xl bg-[var(--color-sand)]/60" />
          ))}
        </div>
        {/* Search input skeleton */}
        <Skeleton className="h-10 w-full sm:w-64 rounded-xl bg-[var(--color-sand)]/60" />
      </div>

      {/* Orders Table Card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] shadow-2xs">
        <div className="border-b border-[var(--color-sand)] p-4 flex items-center justify-between bg-white/40">
          <Skeleton className="h-4 w-32 rounded bg-[var(--color-sand)]" />
          <Skeleton className="h-4 w-20 rounded bg-[var(--color-sand)]/60" />
        </div>
        <div className="divide-y divide-[var(--color-sand)]/60">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded bg-[var(--color-sand)]" />
                <Skeleton className="h-3 w-20 rounded bg-[var(--color-sand)]/50" />
              </div>
              <div className="space-y-1.5 hidden sm:block">
                <Skeleton className="h-4 w-32 rounded bg-[var(--color-sand)]" />
                <Skeleton className="h-3 w-40 rounded bg-[var(--color-sand)]/50" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full bg-[var(--color-sand)]/60 hidden md:block" />
              <Skeleton className="h-6 w-24 rounded-full bg-[var(--color-sand)]/70" />
              <Skeleton className="h-4 w-16 rounded bg-[var(--color-sand)]" />
              <Skeleton className="h-8 w-16 rounded-xl bg-[var(--color-sand)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
