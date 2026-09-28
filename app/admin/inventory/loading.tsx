import { Skeleton } from "@/components/ui/skeleton";

export default function AdminInventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-sand)] pb-6">
        <div>
          <Skeleton className="h-4 w-28 rounded-full bg-[var(--color-navy)]/15" />
          <Skeleton className="mt-2 h-9 w-60 rounded-xl bg-[var(--color-sand)]" />
          <Skeleton className="mt-2 h-4 w-80 rounded bg-[var(--color-sand)]/60" />
        </div>
        <Skeleton className="h-11 w-44 rounded-xl bg-[var(--color-sand)]" />
      </div>

      {/* 4-Card KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded bg-[var(--color-sand)]/60" />
              <Skeleton className="h-4 w-4 rounded bg-[var(--color-sand)]/40" />
            </div>
            <Skeleton className="h-7 w-14 rounded-lg bg-[var(--color-sand)]" />
            <Skeleton className="h-3 w-24 rounded bg-[var(--color-sand)]/40" />
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-11 w-full sm:w-80 rounded-xl bg-[var(--color-sand)]/50" />
        <Skeleton className="h-11 w-48 rounded-xl bg-[var(--color-sand)]/50" />
      </div>

      {/* Inventory Table Card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] shadow-2xs">
        <div className="border-b border-[var(--color-sand)] p-4 flex items-center justify-between bg-white/40">
          <Skeleton className="h-4 w-32 rounded bg-[var(--color-sand)]" />
          <Skeleton className="h-4 w-20 rounded bg-[var(--color-sand)]/60" />
        </div>
        <div className="divide-y divide-[var(--color-sand)]/60">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3.5">
                <Skeleton className="h-12 w-12 rounded-xl bg-[var(--color-sand)] shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40 rounded bg-[var(--color-sand)]" />
                  <Skeleton className="h-3 w-24 rounded bg-[var(--color-sand)]/50" />
                </div>
              </div>
              <Skeleton className="h-4 w-16 rounded bg-[var(--color-sand)]/60 hidden sm:block" />
              <Skeleton className="h-4 w-20 rounded bg-[var(--color-sand)]" />
              <Skeleton className="h-8 w-24 rounded-xl bg-[var(--color-sand)]/70" />
              <Skeleton className="h-8 w-16 rounded-xl bg-[var(--color-sand)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
