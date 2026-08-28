"use client";

import { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, Check } from "lucide-react";

interface ShopFiltersProps {
  categories: string[];
  sizes: string[];
  colors: string[];
  activeCategory?: string;
  activeSize?: string;
  activeColor?: string;
  activeSort?: string;
  totalProducts?: number;
}

function ShopFiltersInner({
  categories,
  sizes,
  colors,
  activeCategory,
  activeSize,
  activeColor,
  activeSort = "default",
  totalProducts = 0,
}: ShopFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Temporary drawer state before clicking "APPLY FILTERS"
  const [draftCategory, setDraftCategory] = useState<string | undefined>(activeCategory);
  const [draftSize, setDraftSize] = useState<string | undefined>(activeSize);
  const [draftColor, setDraftColor] = useState<string | undefined>(activeColor);

  const activeFilterCount = [activeCategory, activeSize, activeColor].filter(Boolean).length;

  const handleOpenDrawer = () => {
    setDraftCategory(activeCategory);
    setDraftSize(activeSize);
    setDraftColor(activeColor);
    setDrawerOpen(true);
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (draftCategory) params.set("category", draftCategory);
    else params.delete("category");

    if (draftSize) params.set("size", draftSize);
    else params.delete("size");

    if (draftColor) params.set("color", draftColor);
    else params.delete("color");

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setDrawerOpen(false);
  };

  const handleClearAllInDrawer = () => {
    setDraftCategory(undefined);
    setDraftSize(undefined);
    setDraftColor(undefined);
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "default") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      {/* Compact Toolbar */}
      <div className="flex items-center justify-between gap-4 py-3 border-y border-[var(--color-sand)]">
        {/* Total Products Count */}
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-navy)]/60">
          {totalProducts} {totalProducts === 1 ? "Product" : "Products"}
        </p>

        {/* Filter Trigger Button & Sort Dropdown */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenDrawer}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeFilterCount > 0
                ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-xs"
                : "bg-[var(--color-cream-alt)] text-[var(--color-navy)] border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[var(--color-sky)] text-[var(--color-navy)] text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort Selector */}
          <div className="relative inline-flex items-center text-xs">
            <span className="mr-1.5 text-[var(--color-navy)]/55 font-medium hidden sm:inline">
              Sort:
            </span>
            <select
              value={activeSort || "default"}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-full px-3.5 py-1.5 pr-7 text-xs font-semibold text-[var(--color-navy)] cursor-pointer focus:outline-none focus:border-[var(--color-navy)]/40"
            >
              <option value="default">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-navy)]/60 text-[10px]">
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Slide-over Filter Drawer Backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Slide-over Filter Drawer Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] bg-[var(--color-cream)] border-l border-[var(--color-sand)] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-sand)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--color-navy)]" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
              Filters
            </h2>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close Filter Drawer"
            className="p-1.5 rounded-full text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body - Scrollable Filter Options */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* CATEGORY SECTION */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
              Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = draftCategory?.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setDraftCategory(isSelected ? undefined : cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                        : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SIZE SECTION */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
              Size (EU)
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {sizes.map((size) => {
                const isSelected = draftSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => setDraftSize(isSelected ? undefined : size)}
                    className={`h-10 rounded-lg text-xs font-semibold flex items-center justify-center transition-all border ${
                      isSelected
                        ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                        : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* COLOR SECTION */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
              Color
            </h3>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const isSelected = draftColor?.toLowerCase() === color.toLowerCase();
                return (
                  <button
                    key={color}
                    onClick={() => setDraftColor(isSelected ? undefined : color)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                        : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                    }`}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 border-t border-[var(--color-sand)] bg-[var(--color-cream-alt)]/60 flex items-center gap-3">
          <button
            onClick={handleClearAllInDrawer}
            className="w-1/2 py-3 px-4 rounded-xl border border-[var(--color-sand)] text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors uppercase tracking-wider text-center"
          >
            Clear All
          </button>
          <button
            onClick={handleApplyFilters}
            className="w-1/2 py-3 px-4 rounded-xl bg-[var(--color-navy)] text-[var(--color-cream)] text-xs font-semibold hover:bg-[var(--color-navy)]/90 transition-colors uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Apply Filters</span>
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

export function ShopFilters(props: ShopFiltersProps) {
  return (
    <Suspense fallback={<div className="h-10 w-full animate-pulse bg-[var(--color-cream-alt)] rounded-lg" />}>
      <ShopFiltersInner {...props} />
    </Suspense>
  );
}