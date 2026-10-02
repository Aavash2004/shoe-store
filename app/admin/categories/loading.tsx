import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCategoriesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Header & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
            Catalog Management
          </span>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-navy)]">
            Categories
          </h1>
          <div className="mt-1 flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-56 rounded bg-[var(--color-sand)]" />
          </div>
        </div>

        <Skeleton className="h-11 w-36 rounded-xl bg-[var(--color-sand)]" />
      </div>

      {/* Categories Table Card */}
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] shadow-2xs">
          <table className="w-full min-w-[550px] text-left">
            <thead>
              <tr className="border-b border-[var(--color-sand)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Products</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/70">
              {[...Array(6)].map((_, i) => (
                <tr key={i}>
                  {/* Name & Slug */}
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-32 rounded bg-[var(--color-sand)]" />
                    <Skeleton className="mt-1.5 h-3 w-20 rounded bg-[var(--color-sand)]/50" />
                  </td>

                  {/* Status switch pill */}
                  <td className="px-6 py-4">
                    <Skeleton className="h-7 w-24 rounded-full bg-[var(--color-sand)]/70" />
                  </td>

                  {/* Product count */}
                  <td className="px-6 py-4 text-right">
                    <Skeleton className="ml-auto h-4 w-8 rounded bg-[var(--color-sand)]/60" />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Skeleton className="h-6 w-20 rounded-lg bg-[var(--color-sand)]/60" />
                      <Skeleton className="h-6 w-12 rounded-lg bg-[var(--color-sand)]/60" />
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

