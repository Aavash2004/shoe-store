"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type ShopFiltersProps = {
  categories: string[];
  sizes: string[];
  colors: string[];
  activeCategory?: string;
  activeSize?: string;
  activeColor?: string;
  activeSort?: string;
};

export function ShopFilters({
  categories,
  sizes,
  colors,
  activeCategory,
  activeSize,
  activeColor,
  activeSort,
}: ShopFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 border-b border-[var(--color-sand)] pb-6">
      {/* Category pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase text-[var(--color-navy)]/60">
          Category
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => updateParam("category", cat)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              activeCategory?.toLowerCase() === cat.toLowerCase()
                ? "border-[var(--color-accent)] bg-[var(--color-cream-alt)]"
                : "border-[var(--color-sand)]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Size pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase text-[var(--color-navy)]/60">
          Size
        </span>
        {sizes.map((s) => (
          <button
            key={s}
            onClick={() => updateParam("size", s)}
            className={`h-8 w-8 rounded-md border text-xs transition-colors ${
              activeSize === s
                ? "border-[var(--color-accent)] bg-[var(--color-cream-alt)]"
                : "border-[var(--color-sand)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Color pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase text-[var(--color-navy)]/60">
          Color
        </span>
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => updateParam("color", c)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              activeColor?.toLowerCase() === c.toLowerCase()
                ? "border-[var(--color-accent)] bg-[var(--color-cream-alt)]"
                : "border-[var(--color-sand)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase text-[var(--color-navy)]/60">
          Sort
        </span>
        <select
          value={activeSort ?? ""}
          onChange={(e) => updateParam("sort", e.target.value || null)}
          className="rounded-md border border-[var(--color-sand)] bg-[var(--color-cream)] px-2 py-1 text-sm text-[var(--color-navy)]"
        >
          <option value="">Default</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
}