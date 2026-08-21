"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

interface ShopFiltersProps {
  categories: string[];
  sizes: string[];
  colors: string[];
  activeCategory?: string;
  activeSize?: string;
  activeColor?: string;
  activeSort?: string;
}

export function ShopFilters({
  categories,
  sizes,
  colors,
  activeCategory,
  activeSize,
  activeColor,
  activeSort = "default",
}: ShopFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value === null || value === activeCategory || value === activeSize || value === activeColor) {
        // Toggle off if clicking the same value
        if (key === "category" && value === activeCategory) params.delete("category");
        else if (key === "size" && value === activeSize) params.delete("size");
        else if (key === "color" && value === activeColor) params.delete("color");
        else if (value) params.set(key, value);
        else params.delete(key);
      } else {
        if (value) params.set(key, value);
        else params.delete(key);
      }

      // Cleaner toggle logic
      const newParams = new URLSearchParams(searchParams.toString());

      if (value && newParams.get(key) === value) {
        newParams.delete(key); // toggle off
      } else if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }

      router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router, activeCategory, activeSize, activeColor]
  );

  const setSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "default") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-5 border-b border-[var(--color-sand)] pb-6">
      {/* Top row: Category + Sort */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-wider text-[var(--color-navy)]/45">
            Category
          </span>
          {categories.map((cat) => {
            const isActive = activeCategory?.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => updateFilter("category", isActive ? null : cat)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-all ${
                  isActive
                    ? "bg-[var(--color-navy)] text-[var(--color-cream)]"
                    : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 hover:bg-[var(--color-sand)]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-navy)]/45">
            Sort
          </span>
          <select
            value={activeSort || "default"}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-full border border-[var(--color-sand)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-navy)]/40"
          >
            <option value="default">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Size */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-[var(--color-navy)]/45">
          Size
        </span>
        {sizes.map((size) => {
          const isActive = activeSize === size;
          return (
            <button
              key={size}
              onClick={() => updateFilter("size", isActive ? null : size)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition-all ${
                isActive
                  ? "bg-[var(--color-navy)] text-[var(--color-cream)]"
                  : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 hover:bg-[var(--color-sand)]"
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>

      {/* Color */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wider text-[var(--color-navy)]/45">
          Color
        </span>
        {colors.map((color) => {
          const isActive = activeColor?.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              onClick={() => updateFilter("color", isActive ? null : color)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-all ${
                isActive
                  ? "bg-[var(--color-navy)] text-[var(--color-cream)]"
                  : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 hover:bg-[var(--color-sand)]"
              }`}
            >
              {color}
            </button>
          );
        })}
      </div>
    </div>
  );
}