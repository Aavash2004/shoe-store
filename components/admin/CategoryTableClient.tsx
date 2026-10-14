"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FolderOpen, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleCategoryActive, deleteCategory } from "@/app/admin/categories/[id]/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export type AdminCategoryItem = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count: {
    products: number;
  };
};

interface CategoryTableClientProps {
  initialCategories: AdminCategoryItem[];
}

type CategoryActionType = "deactivate" | "delete";

export function CategoryTableClient({ initialCategories }: CategoryTableClientProps) {
  const [categories, setCategories] = useState<AdminCategoryItem[]>(initialCategories);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionItem, setActionItem] = useState<{
    category: AdminCategoryItem;
    action: CategoryActionType;
  } | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Shared handler for all destructive/deactivation category actions
  const handleConfirmAction = (category: AdminCategoryItem, action: CategoryActionType) => {
    setErrorNotice(null);
    setActionItem({ category, action });
  };

  const handleToggleClick = (cat: AdminCategoryItem) => {
    setErrorNotice(null);
    if (cat.isActive) {
      handleConfirmAction(cat, "deactivate");
      return;
    }
    executeToggle(cat.id);
  };

  const executeDelete = (id: string) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;

    const previousCategories = [...categories];
    // Optimistic remove
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setPendingId(id);

    startTransition(async () => {
      const res = await deleteCategory(id);
      setPendingId(null);
      if (!res.success) {
        setCategories(previousCategories);
        setErrorNotice(res.error || "Failed to delete category");
      } else {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: {
                message: `Category "${target.name}" was permanently deleted.`,
                type: "success",
              },
            })
          );
        }
      }
    });
  };

  const executeToggle = (id: string) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;

    const previousCategories = [...categories];
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
    setPendingId(id);

    startTransition(async () => {
      const res = await toggleCategoryActive(id);
      setPendingId(null);
      if (!res.success) {
        // Revert on error
        setCategories(previousCategories);
        setErrorNotice(res.error || "Failed to update category status");
      } else {
        const newStatus = !target.isActive;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: {
                message: `Category "${target.name}" is now ${newStatus ? "Active" : "Inactive"}.`,
                type: "success",
              },
            })
          );
        }
      }
    });
  };

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] py-20 text-center">
        <FolderOpen className="mb-4 h-10 w-10 text-[var(--color-navy)]/40" />
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-navy)]">
          No categories yet
        </h2>
        <p className="mt-1 text-xs text-[var(--color-navy)]/60">
          Create your first category to organize your footwear collections.
        </p>
        <Button asChild className="mt-6 rounded-xl bg-[var(--color-navy)] px-5 text-white hover:opacity-90">
          <Link href="/admin/categories/new">Add Category</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorNotice && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorNotice}</span>
        </div>
      )}

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
            {categories.map((cat) => {
              const isUpdating = pendingId === cat.id;

              return (
                <tr
                  key={cat.id}
                  className={`transition-colors hover:bg-[var(--color-sand)]/20 ${
                    !cat.isActive ? "bg-[var(--color-sand)]/10" : ""
                  }`}
                >
                  {/* Category Name & Slug */}
                  <td className="px-6 py-4">
                    <div className="font-semibold text-sm text-[var(--color-navy)]">
                      {cat.name}
                    </div>
                    <div className="font-mono text-[11px] text-[var(--color-navy)]/50">
                      /{cat.slug}
                    </div>
                  </td>

                  {/* Interactive Status Switch & Badge */}
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleClick(cat)}
                      aria-label={`Change status for ${cat.name}. Currently ${
                        cat.isActive ? "Active" : "Inactive"
                      }`}
                      title={
                        cat.isActive
                          ? "Active: Click to set Inactive"
                          : "Inactive: Click to set Active"
                      }
                      className={`group inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${
                        cat.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300"
                          : "border-stone-200 bg-stone-100 text-stone-600 hover:bg-stone-200 hover:border-stone-300"
                      }`}
                    >
                      {/* iOS-style Switch Pill */}
                      <span
                        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200 ${
                          cat.isActive ? "bg-emerald-600" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform duration-200 shadow-xs ${
                            cat.isActive ? "translate-x-3.5" : "translate-x-1"
                          }`}
                        />
                      </span>

                      {/* Label and loading indicator */}
                      <span className="flex items-center gap-1.5 font-medium">
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin text-current" />
                        ) : (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              cat.isActive ? "bg-emerald-500" : "bg-stone-400"
                            }`}
                          />
                        )}
                        <span>{cat.isActive ? "Active" : "Inactive"}</span>
                      </span>
                    </button>
                  </td>

                  {/* Products count */}
                  <td className="px-6 py-4 text-right text-sm font-medium text-[var(--color-navy)]/70">
                    {cat._count.products}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleClick(cat)}
                        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                          cat.isActive
                            ? "border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100"
                        }`}
                        title={cat.isActive ? "Deactivate this category" : "Activate this category"}
                      >
                        {cat.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <Link
                        href={`/admin/categories/${cat.id}`}
                        className="inline-flex items-center rounded-lg border border-[var(--color-sand)] bg-[var(--color-cream)] px-2.5 py-1 text-sm font-semibold text-[var(--color-navy)] hover:border-[var(--color-navy)]/30 hover:bg-white transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleConfirmAction(cat, "delete")}
                        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50/70 p-1 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete category"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unified Confirmation modal for deactivating or deleting a category */}
      {actionItem && (
        <Dialog
          open={Boolean(actionItem)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setActionItem(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div
                className={`flex items-center gap-2.5 mb-1 ${
                  actionItem.action === "delete" ? "text-rose-600" : "text-amber-600"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {actionItem.action === "delete" ? "Delete Category" : "Category Status Change"}
                </span>
              </div>
              <DialogTitle className="text-xl font-bold text-[var(--color-navy)]">
                {actionItem.action === "delete"
                  ? `Delete "${actionItem.category.name}"?`
                  : `Set "${actionItem.category.name}" to Inactive?`}
              </DialogTitle>
              <DialogDescription className="text-sm text-[var(--color-navy)]/70 pt-2 leading-relaxed">
                {actionItem.action === "delete" ? (
                  actionItem.category._count.products > 0 ? (
                    <>
                      Cannot delete this category because it currently contains{" "}
                      <strong className="text-[var(--color-navy)]">
                        {actionItem.category._count.products} product(s)
                      </strong>
                      . Please reassign or delete the products first, or deactivate the category
                      instead to hide it from the storefront.
                    </>
                  ) : (
                    <>
                      Are you sure you want to permanently delete{" "}
                      <strong className="text-[var(--color-navy)]">
                        &quot;{actionItem.category.name}&quot;
                      </strong>
                      ? This action cannot be undone.
                    </>
                  )
                ) : actionItem.category._count.products > 0 ? (
                  <>
                    This category currently contains{" "}
                    <strong className="text-[var(--color-navy)]">
                      {actionItem.category._count.products} product(s)
                    </strong>
                    . Setting it to <strong className="text-amber-800">Inactive</strong> will hide
                    all associated products from the public storefront, search results, and category
                    filters.
                  </>
                ) : (
                  <>
                    Setting &quot;{actionItem.category.name}&quot; to{" "}
                    <strong className="text-amber-800">Inactive</strong> will hide this category from
                    the public storefront navigation and filters.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionItem(null)}
                className="rounded-xl border-[var(--color-sand)]"
              >
                {actionItem.action === "delete" ? "Cancel" : "Keep Active"}
              </Button>

              {actionItem.action === "delete" ? (
                actionItem.category._count.products > 0 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const cat = actionItem.category;
                      setActionItem(null);
                      handleConfirmAction(cat, "deactivate");
                    }}
                    className="rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-semibold"
                  >
                    Deactivate Instead
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      const id = actionItem.category.id;
                      setActionItem(null);
                      executeDelete(id);
                    }}
                    className="rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-semibold"
                  >
                    Delete Category
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    const id = actionItem.category.id;
                    setActionItem(null);
                    executeToggle(id);
                  }}
                  className="rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-semibold"
                >
                  Set Inactive
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
