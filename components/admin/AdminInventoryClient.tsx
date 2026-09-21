"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Boxes,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  Search,
  ExternalLink,
  Edit3,
  Layers,
  ArrowUpDown,
  Filter,
  Check,
  X,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { formatCurrency } from "@/lib/constants/currencies";
import { updateVariantStock } from "@/app/admin/inventory/actions";

export type AdminInventoryVariant = {
  id: string;
  size: string;
  color: string;
  stock: number;
  price: number;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string | null;
    category?: { name: string } | null;
    image: string;
  };
};

interface AdminInventoryClientProps {
  initialVariants: AdminInventoryVariant[];
}

export function AdminInventoryClient({ initialVariants }: AdminInventoryClientProps) {
  const [variants, setVariants] = useState<AdminInventoryVariant[]>(initialVariants);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "OUT" | "HEALTHY">("ALL");
  const [sortBy, setSortBy] = useState<"STOCK_ASC" | "STOCK_DESC" | "NAME_ASC" | "PRICE_DESC">("STOCK_ASC");
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<number>(0);
  const [isSaving, startTransition] = useTransition();

  const debouncedSearch = useDebouncedValue(searchQuery, 150);

  useEffect(() => {
    setVariants(initialVariants);
  }, [initialVariants]);

  const handleStartEdit = (v: AdminInventoryVariant) => {
    setEditingStockId(v.id);
    setTempStock(v.stock);
  };

  const handleSaveStock = (variantId: string) => {
    if (tempStock < 0) return;
    startTransition(async () => {
      const res = await updateVariantStock(variantId, tempStock);
      if (res.success) {
        setVariants((prev) =>
          prev.map((item) =>
            item.id === variantId ? { ...item, stock: tempStock } : item
          )
        );
        setEditingStockId(null);
      }
    });
  };

  // Overall Warehouse & Inventory KPIs
  const kpis = useMemo(() => {
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const v of variants) {
      totalUnits += v.stock;
      if (v.stock === 0) outOfStockCount++;
      else if (v.stock <= 5) lowStockCount++;
    }

    return {
      totalVariants: variants.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      healthyCount: variants.length - lowStockCount - outOfStockCount,
    };
  }, [variants]);

  // Filter & Sort Variants
  const filteredVariants = useMemo(() => {
    return variants
      .filter((v) => {
        // Stock status filter
        if (stockFilter === "LOW" && (v.stock > 5 || v.stock === 0)) return false;
        if (stockFilter === "OUT" && v.stock !== 0) return false;
        if (stockFilter === "HEALTHY" && v.stock <= 5) return false;

        // Search query
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim().toLowerCase();
          const matchesName = v.product.name.toLowerCase().includes(q);
          const matchesBrand = v.product.brand?.toLowerCase().includes(q) ?? false;
          const matchesSize = v.size.toLowerCase().includes(q);
          const matchesColor = v.color.toLowerCase().includes(q);
          const matchesCategory = v.product.category?.name.toLowerCase().includes(q) ?? false;
          if (!matchesName && !matchesBrand && !matchesSize && !matchesColor && !matchesCategory) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "STOCK_ASC") return a.stock - b.stock;
        if (sortBy === "STOCK_DESC") return b.stock - a.stock;
        if (sortBy === "NAME_ASC") return a.product.name.localeCompare(b.product.name);
        if (sortBy === "PRICE_DESC") return b.price - a.price;
        return 0;
      });
  }, [initialVariants, stockFilter, debouncedSearch, sortBy]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-sand)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-navy)]/5 text-[var(--color-navy)]">
              Warehouse & Stock
            </span>
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-navy)]">
            Inventory Management
          </h1>
          <p className="mt-1 text-xs text-[var(--color-navy)]/65">
            Monitor real-time shoe variant quantities, track out-of-stock sizes, and manage fulfillment.
          </p>
        </div>

        <Button
          asChild
          className="h-11 rounded-xl px-5 bg-[var(--color-navy)] hover:bg-[var(--color-navy)]/90 text-white shadow-sm"
        >
          <Link href="/admin/products">
            <Boxes className="mr-2 h-4 w-4" />
            View Products
          </Link>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        {/* Total Active Variants */}
        <button
          type="button"
          onClick={() => setStockFilter("ALL")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            stockFilter === "ALL"
              ? "border-[var(--color-navy)] bg-white shadow-sm ring-2 ring-[var(--color-navy)]/10"
              : "border-[var(--color-sand)] bg-white hover:border-[var(--color-navy)]/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
              Active SKUs
            </span>
            <Layers className="h-4 w-4 text-[var(--color-navy)]/50" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-[var(--color-navy)]">
            {kpis.totalVariants}
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--color-navy)]/50">
            {kpis.totalUnits.toLocaleString()} total units
          </p>
        </button>

        {/* In Stock & Healthy */}
        <button
          type="button"
          onClick={() => setStockFilter("HEALTHY")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            stockFilter === "HEALTHY"
              ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-500/10"
              : "border-[var(--color-sand)] bg-white hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Well Stocked (&gt;5)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700">
            {kpis.healthyCount}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-600/70">Adequate inventory</p>
        </button>

        {/* Low Stock Warning */}
        <button
          type="button"
          onClick={() => setStockFilter("LOW")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            stockFilter === "LOW"
              ? "border-amber-600 bg-white shadow-sm ring-2 ring-amber-500/10"
              : "border-[var(--color-sand)] bg-white hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Low Stock (1-5)
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-800">
            {kpis.lowStockCount}
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700/70">Needs replenishment</p>
        </button>

        {/* Out of Stock */}
        <button
          type="button"
          onClick={() => setStockFilter("OUT")}
          className={`rounded-2xl border p-4 text-left transition-all ${
            stockFilter === "OUT"
              ? "border-rose-600 bg-white shadow-sm ring-2 ring-rose-500/10"
              : "border-[var(--color-sand)] bg-white hover:border-rose-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Out of Stock (0)
            </span>
            <PackageX className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-700">
            {kpis.outOfStockCount}
          </div>
          <p className="mt-0.5 text-[11px] text-rose-600/70">Unavailable for checkout</p>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[var(--color-sand)] bg-white p-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-navy)]/40 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variant by shoe name, size, color, or brand..."
            className="h-10 pl-9 pr-4 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 text-xs text-[var(--color-navy)] placeholder:text-[var(--color-navy)]/40 focus:bg-white"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3 h-3.5 w-3.5 text-[var(--color-navy)]/40 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]/50 pl-8 pr-8 text-xs font-semibold text-[var(--color-navy)] cursor-pointer focus:bg-white focus:outline-none"
            >
              <option value="STOCK_ASC">Stock: Low to High</option>
              <option value="STOCK_DESC">Stock: High to Low</option>
              <option value="NAME_ASC">Shoe Name (A-Z)</option>
              <option value="PRICE_DESC">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {filteredVariants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-sand)] bg-white py-16 text-center shadow-xs">
          <Boxes className="h-12 w-12 text-[var(--color-navy)]/25 mb-3" />
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-navy)]">
            No variants found
          </h3>
          <p className="mt-1 text-xs text-[var(--color-navy)]/60 max-w-sm">
            {searchQuery
              ? `No inventory items matching "${searchQuery}".`
              : "No variants match the selected stock status filter."}
          </p>
          {(searchQuery || stockFilter !== "ALL") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStockFilter("ALL");
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
                  <th className="px-6 py-3.5">Size</th>
                  <th className="px-6 py-3.5">Color</th>
                  <th className="px-6 py-3.5 text-center">Stock Level</th>
                  <th className="px-6 py-3.5 text-right">Unit Price</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-sand)]/60">
                {filteredVariants.map((v) => {
                  return (
                    <tr
                      key={v.id}
                      className="group hover:bg-[var(--color-sand)]/15 transition-colors"
                    >
                      {/* Product with Image Thumbnail */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] shadow-2xs group-hover:border-[var(--color-navy)]/30 transition-colors">
                            <Image
                              src={v.product.image || "/images/Shoes/gmm.jpeg"}
                              alt={v.product.name}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/products/${v.productId}`}
                              className="font-[family-name:var(--font-display)] font-bold text-sm text-[var(--color-navy)] hover:text-[var(--color-sky)] transition-colors line-clamp-1"
                            >
                              {v.product.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              {v.product.brand && (
                                <span className="text-[11px] font-medium text-[var(--color-navy)]/55">
                                  {v.product.brand}
                                </span>
                              )}
                              {v.product.category && (
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-stone-100 text-stone-600">
                                  {v.product.category.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Size Badge */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 text-[var(--color-navy)] border border-stone-200">
                          {v.size}
                        </span>
                      </td>

                      {/* Color Badge */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--color-navy)] bg-stone-50 border border-stone-200/70">
                          <span
                            className="h-2 w-2 rounded-full border border-stone-300"
                            style={{ backgroundColor: v.color.toLowerCase() }}
                          />
                          {v.color}
                        </span>
                      </td>

                      {/* Stock Level with Visual Indicators or Inline Editor */}
                      <td className="px-6 py-4 text-center">
                        {editingStockId === v.id ? (
                          <div className="inline-flex items-center gap-1.5 bg-white border border-[var(--color-navy)] rounded-xl px-2 py-1 shadow-xs">
                            <button
                              type="button"
                              onClick={() => setTempStock((s) => Math.max(0, s - 1))}
                              className="p-1 rounded-md text-stone-500 hover:bg-stone-100 cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <Input
                              type="number"
                              min={0}
                              value={tempStock}
                              onChange={(e) => setTempStock(Math.max(0, parseInt(e.target.value) || 0))}
                              className="h-7 w-16 text-center text-xs font-bold px-1 border-sand"
                            />
                            <button
                              type="button"
                              onClick={() => setTempStock((s) => s + 1)}
                              className="p-1 rounded-md text-stone-500 hover:bg-stone-100 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <Button
                              size="sm"
                              disabled={isSaving}
                              onClick={() => handleSaveStock(v.id)}
                              className="h-7 px-2 text-[11px] rounded-lg bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90 cursor-pointer"
                            >
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </Button>
                            <button
                              type="button"
                              onClick={() => setEditingStockId(null)}
                              className="p-1 rounded-md text-stone-400 hover:text-stone-600 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(v)}
                            className="group/btn cursor-pointer inline-block"
                            title="Click to adjust stock"
                          >
                            {v.stock === 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 group-hover/btn:border-rose-400 transition-colors">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                                0 Units · Out of Stock
                              </span>
                            ) : v.stock <= 3 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 group-hover/btn:border-rose-400 transition-colors">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                                Critical: {v.stock} left
                              </span>
                            ) : v.stock <= 5 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 group-hover/btn:border-amber-400 transition-colors">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                                Low Stock: {v.stock} left
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 group-hover/btn:border-emerald-400 transition-colors">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                {v.stock} in stock
                              </span>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="px-6 py-4 text-right font-bold text-sm text-[var(--color-navy)]">
                        ${v.price.toFixed(2)}
                      </td>

                      {/* Action Links */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--color-sand)] bg-white text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-sand)]/20 transition-all shadow-2xs cursor-pointer"
                            title="Quick Adjust Stock"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Stock</span>
                          </button>
                          <Link
                            href={`/products/${v.product.slug}`}
                            target="_blank"
                            title="View PDP"
                            className="p-1.5 rounded-lg text-stone-400 hover:text-[var(--color-navy)] hover:bg-stone-100 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/admin/products/${v.productId}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--color-sand)] bg-white text-xs font-bold text-[var(--color-navy)] hover:bg-[var(--color-navy)] hover:text-white transition-all shadow-2xs"
                          >
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

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredVariants.map((v) => {
              return (
                <div
                  key={v.id}
                  className="rounded-2xl border border-[var(--color-sand)] bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)]">
                      <Image
                        src={v.product.image || "/images/Shoes/gmm.jpeg"}
                        alt={v.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-navy)]/55">
                        {v.product.brand || "ABXV"}
                      </span>
                      <h4 className="font-[family-name:var(--font-display)] font-bold text-sm text-[var(--color-navy)] line-clamp-1">
                        {v.product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-xs font-bold text-[var(--color-navy)]">
                          Size {v.size}
                        </span>
                        <span className="text-xs text-stone-500 font-medium">
                          Color: {v.color}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-sand)]/60 text-xs">
                    {editingStockId === v.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTempStock((s) => Math.max(0, s - 1))}
                          className="p-1 rounded-md text-stone-500 hover:bg-stone-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <Input
                          type="number"
                          min={0}
                          value={tempStock}
                          onChange={(e) => setTempStock(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-7 w-14 text-center text-xs font-bold px-1 border-sand"
                        />
                        <button
                          type="button"
                          onClick={() => setTempStock((s) => s + 1)}
                          className="p-1 rounded-md text-stone-500 hover:bg-stone-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <Button
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleSaveStock(v.id)}
                          className="h-7 px-2 text-[11px] rounded-lg bg-[var(--color-navy)] text-white"
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setEditingStockId(null)}
                          className="p-1 rounded-md text-stone-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(v)}
                        className={`font-bold cursor-pointer text-left hover:underline ${
                          v.stock === 0
                            ? "text-rose-600"
                            : v.stock <= 5
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {v.stock === 0 ? "Out of stock (Adjust)" : `${v.stock} units available`}
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-navy)]">
                        ${v.price.toFixed(2)}
                      </span>
                      <Link
                        href={`/admin/products/${v.productId}`}
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
