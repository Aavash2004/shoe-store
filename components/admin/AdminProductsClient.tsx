"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Package,
  Search,
  ExternalLink,
  Edit3,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Boxes,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { formatCurrency } from "@/lib/constants/currencies";

export type AdminProductItem = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  isActive: boolean;
  category: { name: string } | null;
  images: { url: string }[];
  variants: { price: any; stock: number; size?: string }[];
  createdAt?: string | Date;
};

interface AdminProductsClientProps {
  initialProducts: AdminProductItem[];
}

export function AdminProductsClient({ initialProducts }: AdminProductsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DRAFT" | "LOW_STOCK">("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "STOCK_ASC">("NEWEST");

  // Debounce search query by 150ms for responsive filtering
  const debouncedSearch = useDebouncedValue(searchQuery, 150);

  // Compute overall KPI metrics
  const kpis = useMemo(() => {
    let active = 0;
    let draft = 0;
    let lowStock = 0;

    for (const p of initialProducts) {
      if (p.isActive) active++;
      else draft++;

      const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
      if (totalStock <= 5) lowStock++;
    }

    return {
      total: initialProducts.length,
      active,
      draft,
      lowStock,
    };
  }, [initialProducts]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((product) => {
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

        // Status tab filter
        if (statusFilter === "ACTIVE" && !product.isActive) return false;
        if (statusFilter === "DRAFT" && product.isActive) return false;
        if (statusFilter === "LOW_STOCK" && totalStock > 5) return false;

        // Search filter
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase();
          const matchesName = product.name.toLowerCase().includes(q);
          const matchesBrand = product.brand?.toLowerCase().includes(q) ?? false;
          const matchesCategory = product.category?.name.toLowerCase().includes(q) ?? false;
          const matchesSlug = product.slug.toLowerCase().includes(q);
          if (!matchesName && !matchesBrand && !matchesCategory && !matchesSlug) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aMinPrice = Math.min(...a.variants.map((v) => Number(v.price) || 0), 0);
        const bMinPrice = Math.min(...b.variants.map((v) => Number(v.price) || 0), 0);
        const aStock = a.variants.reduce((sum, v) => sum + v.stock, 0);
        const bStock = b.variants.reduce((sum, v) => sum + v.stock, 0);

        if (sortBy === "PRICE_ASC") return aMinPrice - bMinPrice;
        if (sortBy === "PRICE_DESC") return bMinPrice - aMinPrice;
        if (sortBy === "STOCK_ASC") return aStock - bStock;
        return 0; // Default order
      });
  }, [initialProducts, statusFilter, debouncedSearch, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-sand)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-navy)]/5 text-[var(--color-navy)]">
              Store Catalog
            </span>
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-navy)]">
            Products
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/65">
            Manage your shoe catalog, inventory status, and variants.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="h-11 rounded-xl px-5 bg-[var(--color-navy)] hover:bg-[var(--color-navy)]/90 text-[var(--color-cream)] shadow-sm transition-transform active:scale-95"
          >
            <Link href="/admin/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New Product
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {/* Total Products */}
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            statusFilter === "ALL"
              ? "border-[var(--color-navy)] bg-white shadow-sm ring-2 ring-[var(--color-navy)]/10"
              : "border-[var(--color-sand)] bg-white hover:border-[var(--color-navy)]/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
              Total Products
            </span>
            <Boxes className="h-4 w-4 text-[var(--color-navy)]/50" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[var(--color-navy)]">{kpis.total}</div>
        </button>

        {/* Active Products */}
        <button
          type="button"
          onClick={() => setStatusFilter("ACTIVE")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            statusFilter === "ACTIVE"
              ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/10"
              : "border-[var(--color-sand)] bg-white hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Active Live
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">{kpis.active}</div>
        </button>

        {/* Drafts */}
        <button
          type="button"
          onClick={() => setStatusFilter("DRAFT")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            statusFilter === "DRAFT"
              ? "border-stone-600 bg-white shadow-sm ring-2 ring-stone-500/10"
              : "border-[var(--color-sand)] bg-white hover:border-stone-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Drafts
            </span>
            <FileText className="h-4 w-4 text-stone-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-stone-700">{kpis.draft}</div>
        </button>

        {/* Low Stock */}
        <button
          type="button"
          onClick={() => setStatusFilter("LOW_STOCK")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            statusFilter === "LOW_STOCK"
              ? "border-rose-500 bg-white shadow-sm ring-2 ring-rose-500/10"
              : "border-[var(--color-sand)] bg-white hover:border-rose-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Low Stock (≤5)
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-700">{kpis.lowStock}</div>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--color-sand)] bg-white p-3 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, brand, category, or slug..."
            className="h-10 pl-9 pr-4 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-navy)]/40 focus:bg-white"
          />
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3 h-3.5 w-3.5 text-[var(--color-navy)]/40 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 pl-8 pr-8 text-xs font-semibold text-[var(--color-navy)] cursor-pointer focus:bg-white focus:outline-none"
            >
              <option value="NEWEST">Newest First</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="STOCK_ASC">Stock: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-sand)] bg-white py-16 text-center shadow-xs">
          <Package className="h-12 w-12 text-[var(--color-navy)]/25 mb-3" />
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
            No products match your criteria
          </h3>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60 max-w-sm">
            {searchQuery
              ? `No results found for "${searchQuery}". Try adjusting your search or filters.`
              : "No products currently available in this category."}
          </p>
          {(searchQuery || statusFilter !== "ALL") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
              }}
              className="mt-4 rounded-xl text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-[var(--color-sand)] bg-white shadow-xs">
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
                {filteredProducts.map((product) => {
                  const imageUrl = product.images[0]?.url || "/images/Shoes/gmm.jpeg";
                  const prices = product.variants.map((v) => Number(v.price) || 0);
                  const minPrice = prices.length ? Math.min(...prices) : 0;
                  const maxPrice = prices.length ? Math.max(...prices) : 0;
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

                  return (
                    <tr
                      key={product.id}
                      className="group hover:bg-[var(--color-sand)]/15 transition-colors"
                    >
                      {/* Product details & thumbnail */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] shadow-2xs group-hover:border-[var(--color-navy)]/30 transition-colors">
                            <Image
                              src={imageUrl}
                              alt={product.name}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="font-[family-name:var(--font-display)] font-bold text-sm text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors line-clamp-1"
                            >
                              {product.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              {product.brand && (
                                <span className="text-[11px] font-medium text-[var(--color-navy)]/55">
                                  {product.brand}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-[var(--color-navy)]/40 truncate max-w-[140px]">
                                /{product.slug}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200/60">
                          {product.category?.name || "Uncategorized"}
                        </span>
                      </td>

                      {/* Variants Count */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                          {product.variants.length} size{product.variants.length !== 1 ? "s" : ""}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-sm text-[var(--color-navy)]">
                          {minPrice === maxPrice
                            ? `$${minPrice.toFixed(2)}`
                            : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`}
                        </div>
                      </td>

                      {/* Stock Health */}
                      <td className="px-6 py-4 text-center">
                        {totalStock === 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            Out of stock
                          </span>
                        ) : totalStock <= 5 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            Low ({totalStock} left)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            {totalStock} in stock
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        {product.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                            Draft
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/products/${product.slug}`}
                            target="_blank"
                            title="View on store"
                            className="p-1.5 rounded-lg text-[var(--color-navy)]/45 hover:text-[var(--color-navy)] hover:bg-stone-100 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-sand)] bg-white text-xs font-bold text-[var(--color-navy)] hover:bg-[var(--color-navy)] hover:text-white transition-all shadow-2xs"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredProducts.map((product) => {
              const imageUrl = product.images[0]?.url || "/images/Shoes/gmm.jpeg";
              const prices = product.variants.map((v) => Number(v.price) || 0);
              const minPrice = prices.length ? Math.min(...prices) : 0;
              const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

              return (
                <div
                  key={product.id}
                  className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
                      <Image src={imageUrl} alt={product.name} fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55 truncate">
                          {product.category?.name || "Uncategorized"}
                        </span>
                        {product.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-600">
                            Draft
                          </span>
                        )}
                      </div>
                      <h4 className="font-[family-name:var(--font-display)] font-bold text-sm text-[var(--color-navy)] line-clamp-1 mt-0.5">
                        {product.name}
                      </h4>
                      <p className="text-xs font-bold text-[var(--color-navy)] mt-1">
                        ${minPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-sand)]/60 text-xs">
                    <span
                      className={`font-semibold ${
                        totalStock <= 5 ? "text-rose-600" : "text-[var(--color-navy)]/70"
                      }`}
                    >
                      {totalStock} in stock ({product.variants.length} sizes)
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        className="p-1.5 text-stone-400 hover:text-stone-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-[var(--color-sand)] text-xs font-bold text-[var(--color-navy)] hover:bg-stone-100"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
