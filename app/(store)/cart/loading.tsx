import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 animate-pulse">
      {/* Title */}
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
        Your Cart
      </h1>

      {/* Cart items list skeleton (matching cart/page.tsx list structure) */}
      <div className="mt-8 flex flex-col gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--color-sand)] pb-4"
          >
            {/* Thumbnail */}
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--color-cream-alt)] border border-[var(--color-sand)]">
              <Skeleton className="h-full w-full rounded-none bg-[var(--color-sand)]/40" />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-44 rounded bg-[var(--color-sand)]" />
              <Skeleton className="h-3 w-28 rounded bg-[var(--color-sand)]/60" />
              <Skeleton className="h-4 w-16 rounded bg-[var(--color-sand)]/80" />
            </div>

            {/* Quantity Stepper */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-md bg-[var(--color-sand)]/50" />
              <Skeleton className="h-4 w-4 rounded bg-[var(--color-sand)]" />
              <Skeleton className="h-7 w-7 rounded-lg bg-[var(--color-sand)]/50" />
            </div>

            {/* Remove Action */}
            <Skeleton className="h-4 w-12 rounded bg-[var(--color-sand)]/40 ml-2" />
          </div>
        ))}
      </div>

      {/* Cart Summary & Promo Code Coupon Box */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start border-t border-[var(--color-sand)] pt-6">
        {/* Left: Promo Code Input Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-36 rounded bg-[var(--color-sand)]/60" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-xl bg-[var(--color-sand)]/50" />
            <Skeleton className="h-10 w-20 rounded-xl bg-[var(--color-sand)]/60" />
          </div>
        </div>

        {/* Right: Estimated Total & Checkout Card */}
        <div className="space-y-3 rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-6 text-xs">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16 rounded bg-[var(--color-sand)]/60" />
            <Skeleton className="h-4 w-14 rounded bg-[var(--color-sand)]" />
          </div>
          <div className="flex justify-between border-t border-[var(--color-sand)] pt-3">
            <Skeleton className="h-5 w-24 rounded bg-[var(--color-sand)]" />
            <Skeleton className="h-5 w-16 rounded bg-[var(--color-sand)]" />
          </div>
          <Skeleton className="w-full mt-3 rounded-xl h-11 bg-[var(--color-navy)]/30" />
        </div>
      </div>
    </div>
  );
}

