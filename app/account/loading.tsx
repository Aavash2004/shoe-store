import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="border-b border-[var(--color-sand)] pb-6 mb-8">
        <Skeleton className="h-4 w-28 bg-[var(--color-sand)]/60 rounded" />
        <Skeleton className="mt-2 h-9 w-48 bg-[var(--color-sand)] rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Navigation Sidebar skeleton */}
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-11 w-full bg-[var(--color-sand)]/70 rounded-xl" />
          ))}
        </div>

        {/* Content area skeleton */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-6 space-y-6">
            <Skeleton className="h-6 w-40 bg-[var(--color-sand)] rounded" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-20 w-full bg-[var(--color-sand)]/60 rounded-xl" />
              <Skeleton className="h-20 w-full bg-[var(--color-sand)]/60 rounded-xl" />
            </div>
            <div className="space-y-4 pt-4 border-t border-[var(--color-sand)]">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2">
                  <Skeleton className="h-4 w-32 bg-[var(--color-sand)] rounded" />
                  <Skeleton className="h-4 w-48 bg-[var(--color-sand)]/50 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
