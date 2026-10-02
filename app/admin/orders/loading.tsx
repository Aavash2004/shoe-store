import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Header & Operational Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-navy)]/5 text-[var(--color-navy)]">
              Order Management
            </span>
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-navy)]">
            Orders &amp; Fulfillment
          </h1>
          <p className="text-xs text-[var(--color-navy)]/65 mt-0.5">
            Triage customer purchases, manage packaging, dispatch status, and fulfillment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-10 w-44 rounded-xl bg-[var(--color-sand)]/60" />
          <Skeleton className="h-10 w-20 rounded-xl bg-[var(--color-sand)]/60" />
          <Skeleton className="h-10 w-28 rounded-xl bg-[var(--color-sand)]/60" />
        </div>
      </div>

      {/* 6-Card KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--color-sand)] bg-white p-3.5 space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 rounded bg-[var(--color-sand)]/60" />
              <Skeleton className="h-3.5 w-3.5 rounded bg-[var(--color-sand)]/40" />
            </div>
            <Skeleton className="h-7 w-12 rounded-lg bg-[var(--color-sand)]" />
            <Skeleton className="h-2.5 w-20 rounded bg-[var(--color-sand)]/40" />
          </div>
        ))}
      </div>

      {/* Interactive Main Surface: Toolbar + Table inside rounded-3xl container */}
      <div className="rounded-3xl border border-[var(--color-sand)] bg-white shadow-sm overflow-hidden">
        {/* Toolbar: Search + Filter Tabs */}
        <div className="flex flex-col gap-4 border-b border-[var(--color-sand)]/70 p-4 sm:flex-row sm:items-center sm:justify-between bg-white">
          <div className="flex flex-wrap items-center gap-1.5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-xl bg-[var(--color-sand)]/60" />
            ))}
          </div>
          <Skeleton className="h-9 w-full sm:w-72 rounded-xl bg-[var(--color-sand)]/50" />
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-sand)]/70 bg-[var(--color-cream-alt)]/60 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-navy)]/60">
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Destination</th>
                <th className="px-5 py-3.5 text-right">Total</th>
                <th className="px-5 py-3.5 text-center">Payment</th>
                <th className="px-5 py-3.5 text-right">Status &amp; Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/60">
              {[...Array(6)].map((_, i) => (
                <tr key={i}>
                  {/* Order */}
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-24 rounded bg-[var(--color-sand)]" />
                    <Skeleton className="mt-1 h-3 w-16 rounded bg-[var(--color-sand)]/50" />
                  </td>

                  {/* Customer */}
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-28 rounded bg-[var(--color-sand)]" />
                    <Skeleton className="mt-1 h-3 w-36 rounded bg-[var(--color-sand)]/50" />
                  </td>

                  {/* Items */}
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-12 rounded bg-[var(--color-sand)]" />
                  </td>

                  {/* Destination */}
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-24 rounded bg-[var(--color-sand)]" />
                  </td>

                  {/* Total */}
                  <td className="px-5 py-4 text-right">
                    <Skeleton className="ml-auto h-4 w-16 rounded bg-[var(--color-sand)]" />
                  </td>

                  {/* Payment */}
                  <td className="px-5 py-4 text-center">
                    <Skeleton className="mx-auto h-6 w-16 rounded-full bg-[var(--color-sand)]/60" />
                  </td>

                  {/* Status & Action */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton className="h-7 w-24 rounded-full bg-[var(--color-sand)]/70" />
                      <Skeleton className="h-7 w-7 rounded-lg bg-[var(--color-sand)]/50" />
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

