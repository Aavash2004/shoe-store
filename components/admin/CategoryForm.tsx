"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FolderPlus, AlertCircle, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategory } from "@/app/admin/categories/new/actions";
import { updateCategory, deleteCategory } from "@/app/admin/categories/[id]/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface CategoryFormProps {
  initialData?: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    productCount?: number;
  };
}

export function CategoryForm({ initialData }: CategoryFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [isCustomSlug, setIsCustomSlug] = useState(Boolean(initialData?.slug));
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!isCustomSlug) {
      setSlug(slugify(newName));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustomSlug(true);
    setSlug(slugify(e.target.value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    startTransition(async () => {
      if (isEditing && initialData?.id) {
        const res = await updateCategory(initialData.id, { name, slug, isActive });
        if (!res.success) {
          setErrorMessage(res.error || "Failed to update category");
        } else {
          router.push("/admin/categories");
          router.refresh();
        }
      } else {
        const res = await createCategory({ name, slug, isActive });
        if (!res.success) {
          setErrorMessage(res.error || "Failed to create category");
        } else {
          router.push("/admin/categories");
          router.refresh();
        }
      }
    });
  };

  const handleDelete = () => {
    if (!initialData?.id) return;
    setErrorMessage("");

    startTransition(async () => {
      const res = await deleteCategory(initialData.id);
      if (!res.success) {
        setShowDeleteDialog(false);
        setErrorMessage(res.error || "Failed to delete category");
      } else {
        router.push("/admin/categories");
        router.refresh();
      }
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream-alt)] text-[var(--color-navy)] hover:bg-[var(--color-sand)]/30"
          >
            <Link href="/admin/categories">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-navy)]/55">
              Catalog Management
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-navy)]">
              {isEditing ? "Edit Category" : "Create New Category"}
            </h1>
          </div>
        </div>

        {isEditing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            className="h-10 rounded-xl border-rose-200 bg-rose-50/50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-[var(--color-sand)] bg-[var(--color-cream-alt)] p-6 md:p-8 space-y-6 shadow-sm">
          {errorMessage && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Category Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Running Shoes, Sneakers, Accessories"
              value={name}
              onChange={handleNameChange}
              className="h-11 rounded-xl border-[var(--color-sand)] bg-white/70 px-4 text-sm text-[var(--color-navy)] focus:bg-white"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-navy)]/70">
                URL Slug
              </label>
              {isCustomSlug && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomSlug(false);
                    setSlug(slugify(name));
                  }}
                  className="text-[11px] font-semibold text-[var(--color-navy)]/60 hover:text-[var(--color-accent)] underline"
                >
                  Reset auto-slug
                </button>
              )}
            </div>
            <Input
              type="text"
              required
              placeholder="e.g. running-shoes"
              value={slug}
              onChange={handleSlugChange}
              className="h-11 rounded-xl border-[var(--color-sand)] bg-white/70 px-4 text-sm text-[var(--color-navy)] focus:bg-white font-mono"
            />
            <p className="text-[11px] text-[var(--color-navy)]/55">
              URL path preview: <code className="rounded bg-[var(--color-sand)]/40 px-1.5 py-0.5 font-mono text-[var(--color-navy)]">/shop?category={slug || "category-slug"}</code>
            </p>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--color-sand)]/70 bg-white/50 p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-navy)]">
                Category Visibility
              </p>
              <p className="text-xs text-[var(--color-navy)]/60">
                Active categories are visible to customers in store filtering.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-[var(--color-sand)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--color-navy)] peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            asChild
            variant="outline"
            className="h-11 rounded-xl border-[var(--color-sand)] bg-[var(--color-cream-alt)] px-6 text-[var(--color-navy)] hover:bg-[var(--color-sand)]/30"
          >
            <Link href="/admin/categories">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={isPending || !name.trim()}
            className="h-11 rounded-xl bg-[var(--color-navy)] px-7 text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Saving..." : "Creating..."}
              </>
            ) : isEditing ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            ) : (
              <>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Category
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {isEditing && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[var(--color-navy)]">
                Delete Category
              </DialogTitle>
              <DialogDescription className="text-sm text-[var(--color-navy)]/70">
                Are you sure you want to delete <strong className="text-[var(--color-navy)]">"{initialData?.name}"</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="rounded-xl border-[var(--color-sand)]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Category"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
