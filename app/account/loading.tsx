import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Banner */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#6E7575]">
          WELCOME BACK
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl text-[var(--color-navy)] font-bold mt-1 tracking-tight">
          Your account at a glance.
        </h1>
      </div>

      {/* Summary Cards Grid (2 Balanced Cards matching account/page.tsx) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Orders Card */}
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E7575]">
              Orders
            </span>
            <Skeleton className="h-10 w-10 rounded-xl bg-[var(--color-sand)]/60" />
          </div>
          <Skeleton className="h-9 w-28 bg-[var(--color-sand)] rounded" />
          <Skeleton className="h-4 w-32 bg-[var(--color-sand)]/60 rounded" />
        </div>

        {/* Wishlist Card */}
        <div className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E7575]">
              Wishlist
            </span>
            <Skeleton className="h-10 w-10 rounded-xl bg-rose-100" />
          </div>
          <Skeleton className="h-9 w-28 bg-[var(--color-sand)] rounded" />
          <Skeleton className="h-4 w-32 bg-[var(--color-sand)]/60 rounded" />
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
            Recent Orders
          </h2>
          <Skeleton className="h-4 w-24 bg-[var(--color-sand)]/60 rounded" />
        </div>

        {/* Order Cards */}
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-sand)]/70 pb-3">
                <Skeleton className="h-4 w-28 bg-[var(--color-sand)] rounded" />
                <Skeleton className="h-6 w-20 rounded-full bg-[var(--color-sand)]/70" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-xl bg-[var(--color-sand)] shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-40 bg-[var(--color-sand)] rounded" />
                  <Skeleton className="h-3 w-20 bg-[var(--color-sand)]/50 rounded" />
                </div>
                <Skeleton className="h-5 w-16 bg-[var(--color-sand)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

