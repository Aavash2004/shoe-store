"use client";

import { Suspense, useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X, Check, RotateCcw, ArrowUpDown } from "lucide-react";

interface ShopFiltersProps {
  categories: readonly string[] | string[];
  brands: readonly string[] | string[];
  sizes: readonly string[] | string[];
  colors: readonly string[] | string[];
  activeCategory?: string;
  activeBrand?: string;
  activeSize?: string;
  activeColor?: string;
  activeMinPrice?: string;
  activeMaxPrice?: string;
  activeInStock?: string;
  activeGender?: string;
  activeSort?: string;
  totalProducts?: number;
  catalogMinPrice?: number;
  catalogMaxPrice?: number;
}

function ShopFiltersInner({
  categories,
  brands,
  sizes,
  colors,
  activeCategory,
  activeBrand,
  activeSize,
  activeColor,
  activeMinPrice,
  activeMaxPrice,
  activeInStock,
  activeGender,
  activeSort = "default",
  totalProducts = 0,
  catalogMinPrice = 0,
  catalogMaxPrice = 500,
}: ShopFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Temporary drawer state before clicking "APPLY FILTERS"
  const [draftCategory, setDraftCategory] = useState<string | undefined>(activeCategory);
  const [draftBrand, setDraftBrand] = useState<string | undefined>(activeBrand);
  const [draftSize, setDraftSize] = useState<string | undefined>(activeSize);
  const [draftColor, setDraftColor] = useState<string | undefined>(activeColor);
  const [draftMinPrice, setDraftMinPrice] = useState<string | undefined>(activeMinPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState<string | undefined>(activeMaxPrice);
  const [draftInStock, setDraftInStock] = useState<boolean>(activeInStock === "true");
  const [draftGender, setDraftGender] = useState<string | undefined>(activeGender);

  // Sync draft states whenever active props change (e.g. browser back/forward navigation)
  useEffect(() => {
    setDraftCategory(activeCategory);
    setDraftBrand(activeBrand);
    setDraftSize(activeSize);
    setDraftColor(activeColor);
    setDraftMinPrice(activeMinPrice);
    setDraftMaxPrice(activeMaxPrice);
    setDraftInStock(activeInStock === "true");
    setDraftGender(activeGender);
  }, [
    activeCategory,
    activeBrand,
    activeSize,
    activeColor,
    activeMinPrice,
    activeMaxPrice,
    activeInStock,
    activeGender,
  ]);

  const activeFilterCount = [
    activeCategory,
    activeBrand,
    activeSize,
    activeColor,
    activeMinPrice,
    activeMaxPrice,
    activeInStock === "true" ? "inStock" : undefined,
    activeGender,
  ].filter(Boolean).length;

  const handleOpenDrawer = () => {
    setDraftCategory(activeCategory);
    setDraftBrand(activeBrand);
    setDraftSize(activeSize);
    setDraftColor(activeColor);
    setDraftMinPrice(activeMinPrice);
    setDraftMaxPrice(activeMaxPrice);
    setDraftInStock(activeInStock === "true");
    setDraftGender(activeGender);
    setDrawerOpen(true);
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    // When applying new filters, reset to page 1
    params.delete("page");

    if (draftCategory) params.set("category", draftCategory);
    else params.delete("category");

    if (draftBrand) params.set("brand", draftBrand);
    else params.delete("brand");

    if (draftSize) params.set("size", draftSize);
    else params.delete("size");

    if (draftColor) params.set("color", draftColor);
    else params.delete("color");

    if (draftMinPrice && Number(draftMinPrice) > catalogMinPrice) {
      params.set("minPrice", draftMinPrice);
    } else {
      params.delete("minPrice");
    }

    if (draftMaxPrice && Number(draftMaxPrice) < catalogMaxPrice) {
      params.set("maxPrice", draftMaxPrice);
    } else {
      params.delete("maxPrice");
    }

    if (draftInStock) params.set("inStock", "true");
    else params.delete("inStock");

    if (draftGender) params.set("gender", draftGender);
    else params.delete("gender");

    // Use router.push to create a proper history entry for the applied filter state
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}` as any, { scroll: false });
    });
    setDrawerOpen(false);
  };

  const handleClearAllInDrawer = () => {
    setDraftCategory(undefined);
    setDraftBrand(undefined);
    setDraftSize(undefined);
    setDraftColor(undefined);
    setDraftMinPrice(undefined);
    setDraftMaxPrice(undefined);
    setDraftInStock(false);
    setDraftGender(undefined);
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value === "default") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    // Discrete sort changes create history entries
    router.push(`${pathname}?${params.toString()}` as any, { scroll: false });
  };

  return (
    <>
      {/* Compact Toolbar */}
      <div className="flex items-center justify-between gap-4 py-3 border-y border-[var(--color-sand)]">
        {/* Total Products Count */}
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-navy)]/70">
          {totalProducts} {totalProducts === 1 ? "Product" : "Products"}
        </p>

        {/* Filter Trigger Button & Sort Dropdown */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenDrawer}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
              activeFilterCount > 0
                ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-xs"
                : "bg-[var(--color-cream-alt)] text-[var(--color-navy)] border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-cream)] text-[var(--color-navy)] text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort By Dropdown */}
          <div className="relative inline-flex items-center">
            <label htmlFor="shop-sort-select" className="sr-only">
              Sort by
            </label>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60 mr-2 hidden sm:inline">
              Sort:
            </span>
            <select
              id="shop-sort-select"
              value={activeSort || "default"}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-lg px-3 py-1.5 pr-7 text-xs font-semibold text-[var(--color-navy)] cursor-pointer focus:outline-none focus:border-[var(--color-navy)]/40"
            >
              <option value="default">Featured</option>
              <option value="newest">Newest Releases</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-navy)]/60 w-3 h-3" />
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
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-[var(--color-cream)] border-l border-[var(--color-sand)] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-sand)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--color-navy)]" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
              Refine Collection
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close Filter Drawer"
            className="p-1.5 rounded-full text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body - Scrollable Filter Options */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* IN-STOCK ONLY TOGGLE */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
            <div>
              <span className="text-xs font-bold text-[var(--color-navy)] block">
                In-Stock Only
              </span>
              <span className="text-[11px] text-[var(--color-navy)]/60">
                Only show footwear ready to ship
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draftInStock}
              onClick={() => setDraftInStock(!draftInStock)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                draftInStock ? "bg-emerald-600" : "bg-stone-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  draftInStock ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* GENDER / COLLECTION */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
              Department / Gender
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "All", value: undefined },
                { label: "Men", value: "MEN" },
                { label: "Women", value: "WOMEN" },
                { label: "Unisex", value: "UNISEX" },
              ].map((g) => {
                const isSelected = draftGender === g.value;
                return (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => setDraftGender(g.value)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-xs"
                        : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* BRANDS SECTION */}
          {brands.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                Brand
              </h3>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => {
                  const isSelected = draftBrand?.toLowerCase() === b.toLowerCase();
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setDraftBrand(isSelected ? undefined : b)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-xs"
                          : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                      }`}
                    >
                      {b}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PRICE RANGE SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                Price Range
              </h3>
              {(draftMinPrice || draftMaxPrice) && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftMinPrice(undefined);
                    setDraftMaxPrice(undefined);
                  }}
                  className="text-[11px] text-[var(--color-navy)]/60 hover:text-[var(--color-navy)] underline cursor-pointer"
                >
                  Reset Price
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-[10px] text-[var(--color-navy)]/60 uppercase font-semibold">
                  Min ($)
                </span>
                <input
                  type="number"
                  min={catalogMinPrice}
                  max={catalogMaxPrice}
                  placeholder={`$${catalogMinPrice}`}
                  value={draftMinPrice ?? ""}
                  onChange={(e) => setDraftMinPrice(e.target.value || undefined)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-cream-alt)] border border-[var(--color-sand)] text-xs font-semibold text-[var(--color-navy)] focus:outline-none focus:border-[var(--color-navy)]"
                />
              </div>

              <span className="text-[var(--color-navy)]/40 mt-4">–</span>

              <div className="flex-1">
                <span className="text-[10px] text-[var(--color-navy)]/60 uppercase font-semibold">
                  Max ($)
                </span>
                <input
                  type="number"
                  min={catalogMinPrice}
                  max={catalogMaxPrice}
                  placeholder={`$${catalogMaxPrice}`}
                  value={draftMaxPrice ?? ""}
                  onChange={(e) => setDraftMaxPrice(e.target.value || undefined)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-cream-alt)] border border-[var(--color-sand)] text-xs font-semibold text-[var(--color-navy)] focus:outline-none focus:border-[var(--color-navy)]"
                />
              </div>
            </div>

            {/* Quick Price Bracket Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: "Under $100", min: undefined, max: "100" },
                { label: "$100 – $200", min: "100", max: "200" },
                { label: "$200+", min: "200", max: undefined },
              ].map((bracket) => {
                const isActiveBracket =
                  draftMinPrice === bracket.min && draftMaxPrice === bracket.max;
                return (
                  <button
                    key={bracket.label}
                    type="button"
                    onClick={() => {
                      setDraftMinPrice(bracket.min);
                      setDraftMaxPrice(bracket.max);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-colors ${
                      isActiveBracket
                        ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                        : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/70 border-[var(--color-sand)] hover:bg-[var(--color-sand)]/30"
                    }`}
                  >
                    {bracket.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CATEGORY SECTION */}
          {categories.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                Category
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = draftCategory?.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDraftCategory(isSelected ? undefined : cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-xs"
                          : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SIZE SECTION */}
          {sizes.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                Size (EU)
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {sizes.map((sz) => {
                  const isSelected = draftSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setDraftSize(isSelected ? undefined : sz)}
                      className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-xs"
                          : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLOR SECTION */}
          {colors.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                Color
              </h3>
              <div className="flex flex-wrap gap-2">
                {colors.map((clr) => {
                  const isSelected = draftColor?.toLowerCase() === clr.toLowerCase();
                  return (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setDraftColor(isSelected ? undefined : clr)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                        isSelected
                          ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)] shadow-xs"
                          : "bg-[var(--color-cream-alt)] text-[var(--color-navy)]/80 border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                      }`}
                    >
                      {clr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 border-t border-[var(--color-sand)] bg-[var(--color-cream-alt)]/60 flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearAllInDrawer}
            className="w-1/2 py-3 px-4 rounded-lg border border-[var(--color-sand)] text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/40 transition-colors uppercase tracking-wider text-center cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleApplyFilters}
            className="w-1/2 py-3 px-4 rounded-lg bg-[var(--color-navy)] text-[var(--color-cream)] text-xs font-semibold hover:bg-[var(--color-navy)]/90 transition-colors uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            <span>{isPending ? "Applying..." : "Apply Filters"}</span>
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