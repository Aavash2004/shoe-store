import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-navy)] animate-pulse">
      {/* 1. Collection Banner Skeleton */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-4">
        <div className="relative h-[220px] sm:h-[260px] lg:h-[300px] overflow-hidden rounded-2xl bg-[var(--color-navy)]/15 flex items-center justify-center">
          <div className="text-center px-6">
            <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#F5F2EB]/90">
              Shop Collection
            </h1>
          </div>
        </div>
      </section>

      {/* 2. Main Content Container */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10 pb-20">
        {/* Shop Introduction */}
        <div className="max-w-xl space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#1E2A38]/50 block">
            COLLECTION
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#1E2A38]">
            All Footwear
          </h2>
          <p className="text-xs sm:text-sm text-[#1E2A38]/70 pt-0.5 leading-relaxed">
            Explore the latest footwear designed for everyday movement, sport, and lifestyle.
          </p>
        </div>

        {/* 3. Filter & Sort Toolbar placeholder */}
        <div className="mt-6">
          <div className="h-12 w-full rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/60" />
        </div>

        {/* 4. Full-width 4-column Product Grid (matching ProductGrid & ProductCard) */}
        <div className="mt-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(12)].map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-sm border border-[var(--color-sand)]/80 bg-[var(--color-cream-alt)]/60"
              >
                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden bg-stone-200/60">
                  <Skeleton className="h-full w-full rounded-none bg-[var(--color-sand)]/40" />
                  <div className="absolute top-2.5 right-2.5">
                    <Skeleton className="h-8 w-8 rounded-full bg-white/70" />
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-3.5 sm:p-4 space-y-1.5">
                  <Skeleton className="h-3 w-20 rounded bg-[var(--color-sand)]/60" />
                  <Skeleton className="h-4 w-3/4 rounded bg-[var(--color-sand)]" />
                  <Skeleton className="mt-1 h-4 w-14 rounded bg-[var(--color-sand)]/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

