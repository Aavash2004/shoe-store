import { Clock } from "lucide-react";

export function OrderConfirmationSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] py-12 px-4 md:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Status Card Skeleton */}
        <div className="rounded-3xl border border-[var(--color-sand)] bg-white p-6 md:p-10 shadow-sm text-center">
          {/* Header Icon Pulse */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50 animate-pulse">
              <Clock className="h-10 w-10 text-amber-500/80 animate-spin" />
            </div>
          </div>

          {/* Badge Skeleton */}
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-4 py-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider mb-3 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            Confirming Payment Status...
          </div>

          {/* Heading and Description */}
          <div className="mx-auto max-w-md space-y-2">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-navy)] md:text-3xl">
              Finalizing Your Order...
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-navy)]/60">
              Receiving transaction confirmation and generating your receipt...
            </p>
          </div>

          {/* Key Details Card Skeleton */}
          <div className="mt-8 rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream)]/40 p-5 text-left text-sm space-y-3 animate-pulse">
            <div className="flex justify-between items-center border-b border-[var(--color-sand)]/60 pb-2.5">
              <div className="h-4 w-24 rounded bg-[var(--color-sand)]/70" />
              <div className="h-4 w-36 rounded bg-[var(--color-sand)]/70" />
            </div>
            <div className="flex justify-between items-center border-b border-[var(--color-sand)]/60 pb-2.5">
              <div className="h-4 w-28 rounded bg-[var(--color-sand)]/70" />
              <div className="h-4 w-32 rounded bg-[var(--color-sand)]/70" />
            </div>
            <div className="flex justify-between items-center border-b border-[var(--color-sand)]/60 pb-2.5">
              <div className="h-4 w-24 rounded bg-[var(--color-sand)]/70" />
              <div className="h-4 w-20 rounded bg-[var(--color-sand)]/70" />
            </div>
            <div className="flex justify-between items-center pt-1">
              <div className="h-5 w-24 rounded bg-[var(--color-sand)]/80" />
              <div className="h-5 w-24 rounded bg-[var(--color-sand)]/80" />
            </div>
          </div>

          {/* Order Items Skeleton */}
          <div className="mt-6 rounded-2xl border border-[var(--color-sand)] bg-white p-5 text-left space-y-3 animate-pulse">
            <div className="h-4 w-28 rounded bg-[var(--color-sand)]/70 mb-3" />
            <div className="flex items-center gap-3.5 py-2">
              <div className="h-16 w-16 shrink-0 rounded-xl bg-[var(--color-sand)]/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-44 rounded bg-[var(--color-sand)]/70" />
                <div className="h-3 w-24 rounded bg-[var(--color-sand)]/50" />
              </div>
              <div className="h-4 w-16 rounded bg-[var(--color-sand)]/70" />
            </div>
          </div>

          {/* Delivery Address Skeleton */}
          <div className="mt-6 rounded-2xl border border-[var(--color-sand)] bg-white p-5 text-left space-y-2 animate-pulse">
            <div className="h-4 w-32 rounded bg-[var(--color-sand)]/70 mb-2" />
            <div className="h-3.5 w-40 rounded bg-[var(--color-sand)]/50" />
            <div className="h-3.5 w-56 rounded bg-[var(--color-sand)]/50" />
          </div>

          {/* Action Buttons Skeleton */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center animate-pulse">
            <div className="h-12 w-full sm:w-44 rounded-xl bg-[var(--color-sand)]/60" />
            <div className="h-12 w-full sm:w-44 rounded-xl bg-[var(--color-sand)]/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
