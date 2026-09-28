import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCategoriesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Header & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-3 w-32 rounded bg-[var(--color-navy)]/20" />
          <Skeleton className="mt-2 h-9 w-44 rounded-xl bg-[var(--color-sand)]" />
          <Skeleton className="mt-2 h-4 w-60 rounded bg-[var(--color-sand)]/60" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl bg-[var(--color-sand)]" />
      </div>

      {/* Categories Table Card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] shadow-2xs">
        <div className="border-b border-[var(--color-sand)] p-4 flex items-center justify-between bg-white/40">
          <Skeleton className="h-4 w-28 rounded bg-[var(--color-sand)]" />
          <Skeleton className="h-4 w-20 rounded bg-[var(--color-sand)]/60" />
        </div>
        <div className="divide-y divide-[var(--color-sand)]/70">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36 rounded bg-[var(--color-sand)]" />
                <Skeleton className="h-3 w-24 rounded bg-[var(--color-sand)]/50" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full bg-[var(--color-sand)]/70" />
              <Skeleton className="h-7 w-24 rounded-xl bg-[var(--color-sand)]/50" />
              <Skeleton className="h-4 w-10 rounded bg-[var(--color-sand)]" />
              <Skeleton className="h-7 w-14 rounded-lg bg-[var(--color-sand)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
