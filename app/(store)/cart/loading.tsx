import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="border-b border-[var(--color-sand)] pb-6 mb-8">
        <Skeleton className="h-4 w-24 bg-[var(--color-sand)]/60 rounded" />
        <Skeleton className="mt-2 h-9 w-40 bg-[var(--color-sand)] rounded-lg" />
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Cart items list skeleton */}
        <div className="lg:col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-4"
            >
              <Skeleton className="h-24 w-24 rounded-xl bg-[var(--color-sand)] shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40 bg-[var(--color-sand)] rounded" />
                <Skeleton className="h-4 w-24 bg-[var(--color-sand)]/60 rounded" />
                <Skeleton className="h-6 w-20 bg-[var(--color-sand)] rounded" />
              </div>
              <div className="flex flex-col items-end gap-3">
                <Skeleton className="h-8 w-24 bg-[var(--color-sand)] rounded-xl" />
                <Skeleton className="h-5 w-5 bg-[var(--color-sand)]/50 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary skeleton */}
        <div>
          <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-6 space-y-6">
            <Skeleton className="h-6 w-36 bg-[var(--color-sand)] rounded" />
            <div className="space-y-3 pt-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20 bg-[var(--color-sand)]/60 rounded" />
                <Skeleton className="h-4 w-16 bg-[var(--color-sand)] rounded" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20 bg-[var(--color-sand)]/60 rounded" />
                <Skeleton className="h-4 w-16 bg-[var(--color-sand)] rounded" />
              </div>
              <div className="flex justify-between pt-3 border-t border-[var(--color-sand)]">
                <Skeleton className="h-5 w-24 bg-[var(--color-sand)] rounded" />
                <Skeleton className="h-6 w-20 bg-[var(--color-sand)] rounded" />
              </div>
            </div>
            <Skeleton className="h-12 w-full bg-[var(--color-navy)]/30 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
