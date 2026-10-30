"use client";

import { useState, useTransition } from "react";
import {
  Boxes,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { staffAdjustStock } from "@/app/staff/inventory/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface StaffVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  product: {
    id: string;
    name: string;
    brand: string | null;
    image: string;
  };
}

interface StaffInventoryClientProps {
  initialVariants: StaffVariant[];
}

export function StaffInventoryClient({ initialVariants }: StaffInventoryClientProps) {
  const [variants, setVariants] = useState<StaffVariant[]>(initialVariants);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [isPending, startTransition] = useTransition();

  // Adjustment Modal
  const [selectedVariant, setSelectedVariant] = useState<StaffVariant | null>(null);
  const [delta, setDelta] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredVariants = variants.filter((v) => {
    const matchesSearch =
      v.product.name.toLowerCase().includes(search.toLowerCase()) ||
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.color.toLowerCase().includes(search.toLowerCase()) ||
      v.size.toLowerCase().includes(search.toLowerCase()) ||
      (v.product.brand && v.product.brand.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === "LOW_STOCK") return v.stock > 0 && v.stock <= 5;
    if (filter === "OUT_OF_STOCK") return v.stock === 0;
    return true;
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    if (delta === 0) {
      setErrorMessage("Adjustment delta cannot be zero.");
      return;
    }

    if (!reason.trim()) {
      setErrorMessage("A valid reason is required for staff audit logs.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await staffAdjustStock({
        variantId: selectedVariant.id,
        delta,
        reason: reason.trim(),
      });

      if (!res.success) {
        if (res.error === "Password change required" || (res as any).redirect) {
          window.location.href = "/staff/change-password";
          return;
        }
        setErrorMessage(res.error || "Failed to adjust stock");
      } else {
        setVariants((prev) =>
          prev.map((v) => (v.id === selectedVariant.id ? { ...v, stock: res.newStock } : v))
        );
        setSuccessMessage(
          `Stock for ${selectedVariant.product.name} (${selectedVariant.color}, ${selectedVariant.size}) updated to ${res.newStock}.`
        );
        setSelectedVariant(null);
        setDelta(1);
        setReason("");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-navy)] flex items-center gap-2">
          <Boxes className="w-7 h-7 text-[var(--color-navy)]/80" />
          Inventory Management
        </h1>
        <p className="text-sm text-[var(--color-navy)]/60">
          Track shoe variant stock levels and execute auditable stock adjustments
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-xl border border-[var(--color-sand)] p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[var(--color-navy)]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search variant, SKU, size, color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {[
            { label: "All Items", value: "ALL" },
            { label: "Low Stock (≤5)", value: "LOW_STOCK" },
            { label: "Out of Stock (0)", value: "OUT_OF_STOCK" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filter === tab.value
                  ? "bg-[var(--color-navy)] text-white shadow-sm"
                  : "bg-slate-100 text-[var(--color-navy)]/70 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-[var(--color-sand)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-[var(--color-sand)] text-[11px] font-bold uppercase tracking-wider text-[var(--color-navy)]/60">
              <tr>
                <th className="px-5 py-3.5">Product & Variant</th>
                <th className="px-4 py-3.5">SKU</th>
                <th className="px-4 py-3.5">Size</th>
                <th className="px-4 py-3.5">Color</th>
                <th className="px-4 py-3.5 text-center">Current Stock</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-sand)]/60">
              {filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-[var(--color-navy)]/50">
                    No variants match your search filter.
                  </td>
                </tr>
              ) : (
                filteredVariants.map((v) => {
                  const isOutOfStock = v.stock === 0;
                  const isLowStock = v.stock > 0 && v.stock <= 5;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {v.product.image ? (
                            <img
                              src={v.product.image}
                              alt={v.product.name}
                              className="w-10 h-10 object-cover rounded-lg border border-[var(--color-sand)] shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-[var(--color-sand)] flex items-center justify-center text-xs text-slate-400 shrink-0">
                              IMG
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-xs text-[var(--color-navy)]">
                              {v.product.name}
                            </p>
                            {v.product.brand && (
                              <p className="text-[11px] text-[var(--color-navy)]/50">
                                {v.product.brand}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--color-navy)]/70">
                        {v.sku}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-medium text-[var(--color-navy)]">
                        {v.size}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-[var(--color-navy)]/80">
                        {v.color}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isOutOfStock
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : isLowStock
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {v.stock} units
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedVariant(v);
                            setDelta(1);
                            setReason("");
                            setErrorMessage(null);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[var(--color-sand)] bg-white text-xs font-semibold text-[var(--color-navy)] hover:bg-slate-100 hover:border-[var(--color-navy)]/30 transition-all shadow-sm"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      <Dialog
        open={!!selectedVariant}
        onOpenChange={(open) => !open && setSelectedVariant(null)}
      >
        <DialogContent className="max-w-md bg-white border-[var(--color-sand)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[var(--color-navy)] flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[var(--color-navy)]/80" />
              Adjust Variant Stock
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--color-navy)]/60">
              Record a stock addition (restock) or reduction (damage/audit) with mandatory reason.
            </DialogDescription>
          </DialogHeader>

          {selectedVariant && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-[var(--color-cream)] border border-[var(--color-sand)] flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-[var(--color-navy)]">
                    {selectedVariant.product.name}
                  </p>
                  <p className="text-[var(--color-navy)]/60">
                    SKU: {selectedVariant.sku} • {selectedVariant.color} / Size {selectedVariant.size}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[var(--color-navy)]/50">Current Stock</p>
                  <p className="text-base font-bold text-[var(--color-navy)]">
                    {selectedVariant.stock}
                  </p>
                </div>
              </div>

              {/* Delta Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70 mb-1.5">
                  Stock Adjustment (Delta)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setDelta((d) => d - 1)}
                    className="p-2 rounded-lg border border-[var(--color-sand)] hover:bg-slate-100 text-[var(--color-navy)]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={delta}
                    onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
                    className="flex-1 text-center py-2 rounded-lg border border-[var(--color-sand)] text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setDelta((d) => d + 1)}
                    className="p-2 rounded-lg border border-[var(--color-sand)] hover:bg-slate-100 text-[var(--color-navy)]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Preset delta chips */}
                <div className="flex gap-1.5">
                  {[+1, +5, +10, +25, -1, -5].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDelta(preset)}
                      className={`px-2 py-1 text-[11px] font-mono font-semibold rounded border transition-colors ${
                        delta === preset
                          ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)]"
                          : "bg-slate-50 text-[var(--color-navy)]/70 border-[var(--color-sand)] hover:bg-slate-100"
                      }`}
                    >
                      {preset > 0 ? `+${preset}` : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview resulting stock */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-[var(--color-navy)]/70">Resulting Stock Level:</span>
                <span
                  className={`font-bold font-mono text-sm ${
                    selectedVariant.stock + delta < 0
                      ? "text-red-600"
                      : "text-[var(--color-navy)]"
                  }`}
                >
                  {selectedVariant.stock} {delta >= 0 ? "+" : ""} {delta} ={" "}
                  {selectedVariant.stock + delta}{" "}
                  {selectedVariant.stock + delta < 0 && "(INVALID)"}
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70 mb-1">
                  Reason for Adjustment <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Received shipment, returned item, damage write-off"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-sand)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVariant(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--color-sand)] text-[var(--color-navy)]/70 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || selectedVariant.stock + delta < 0 || delta === 0}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Applying..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
