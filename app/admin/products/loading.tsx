import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-sand)] pb-6">
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-navy)]/5 text-[var(--color-navy)]">
            Store Catalog
          </span>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-navy)]">
            Products
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/65">
            Manage your shoe catalog, inventory status, and variants.
          </p>
        </div>

        <Skeleton className="h-11 w-40 rounded-xl bg-[var(--color-sand)]" />
      </div>

      {/* KPI Stat Cards Strip */}
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
            <Skeleton className="h-7 w-12 rounded-lg bg-[var(--color-sand)]" />
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--color-sand)] bg-white p-3 shadow-xs">
        <Skeleton className="h-10 w-full sm:w-80 rounded-xl bg-[var(--color-sand)]/50" />
        <Skeleton className="h-10 w-44 rounded-xl bg-[var(--color-sand)]/50" />
      </div>

      {/* Products Table Card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--color-sand)] bg-stone-50/80 text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5 text-center">Variants</th>
                <th className="px-6 py-3.5 text-right">Price</th>
                <th className="px-6 py-3.5 text-center">Stock Health</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/60">
              {[...Array(6)].map((_, i) => (
                <tr key={i}>
                  {/* Product details & thumbnail */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3.5">
                      <Skeleton className="h-13 w-13 rounded-xl bg-[var(--color-sand)] shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-40 rounded bg-[var(--color-sand)]" />
                        <Skeleton className="h-3 w-24 rounded bg-[var(--color-sand)]/50" />
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4">
                    <Skeleton className="h-6 w-20 rounded-lg bg-[var(--color-sand)]/60" />
                  </td>

                  {/* Variants */}
                  <td className="px-6 py-4 text-center">
                    <Skeleton className="mx-auto h-6 w-14 rounded-lg bg-[var(--color-sand)]/50" />
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4 text-right">
                    <Skeleton className="ml-auto h-4 w-16 rounded bg-[var(--color-sand)]" />
                  </td>

                  {/* Stock Health */}
                  <td className="px-6 py-4 text-center">
                    <Skeleton className="mx-auto h-6 w-20 rounded-full bg-[var(--color-sand)]/70" />
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 text-center">
                    <Skeleton className="mx-auto h-6 w-16 rounded-full bg-[var(--color-sand)]/60" />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <Skeleton className="ml-auto h-8 w-14 rounded-lg bg-[var(--color-sand)]" />
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

