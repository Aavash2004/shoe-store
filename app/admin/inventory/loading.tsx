import { Skeleton } from "@/components/ui/skeleton";

export default function AdminInventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-sand)] pb-6">
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-navy)]/5 text-[var(--color-navy)]">
            Warehouse & Stock
          </span>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-navy)]">
            Inventory Management
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/65">
            Monitor real-time shoe variant quantities, track out-of-stock sizes, and manage fulfillment.
          </p>
        </div>

        <Skeleton className="h-11 w-40 rounded-xl bg-[var(--color-sand)]" />
      </div>

      {/* 4-Card KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 rounded bg-[var(--color-sand)]/60" />
              <Skeleton className="h-4 w-4 rounded bg-[var(--color-sand)]/40" />
            </div>
            <Skeleton className="h-7 w-14 rounded-lg bg-[var(--color-sand)]" />
            <Skeleton className="h-3 w-24 rounded bg-[var(--color-sand)]/40" />
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--color-sand)] bg-white p-3 shadow-xs">
        <Skeleton className="h-10 w-full sm:w-80 rounded-xl bg-[var(--color-sand)]/50" />
        <Skeleton className="h-10 w-48 rounded-xl bg-[var(--color-sand)]/50" />
      </div>

      {/* Inventory Table Card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-sand)] bg-stone-50/80 text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Size</th>
                <th className="px-6 py-3.5">Color</th>
                <th className="px-6 py-3.5 text-center">Stock Level</th>
                <th className="px-6 py-3.5 text-right">Unit Price</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/60">
              {[...Array(6)].map((_, i) => (
                <tr key={i}>
                  {/* Product */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <Skeleton className="h-13 w-13 rounded-xl bg-[var(--color-sand)] shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-40 rounded bg-[var(--color-sand)]" />
                        <Skeleton className="h-3 w-24 rounded bg-[var(--color-sand)]/50" />
                      </div>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-12 rounded-lg bg-[var(--color-sand)]/60" />
                  </td>

                  {/* Color */}
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-16 rounded bg-[var(--color-sand)]/60" />
                  </td>

                  {/* Stock Level */}
                  <td className="px-6 py-4 text-center">
                    <Skeleton className="mx-auto h-6 w-20 rounded-full bg-[var(--color-sand)]/70" />
                  </td>

                  {/* Unit Price */}
                  <td className="px-6 py-4 text-right">
                    <Skeleton className="ml-auto h-4 w-16 rounded bg-[var(--color-sand)]" />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton className="h-8 w-14 rounded-lg bg-[var(--color-sand)]/70" />
                      <Skeleton className="h-8 w-8 rounded-lg bg-[var(--color-sand)]/50" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

