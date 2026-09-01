"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Loader2,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProduct } from "@/app/admin/products/new/actions";
import { updateProduct } from "@/app/admin/products/[id]/actions";
import type { CreateProductInput } from "@/lib/validations/product";
import { deleteProduct } from "@/app/admin/products/[id]/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";


type Category = { id: string; name: string };

type ExistingProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string | null;
  categoryId: string;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  images: { url: string; altText: string | null; isPrimary: boolean }[];
  variants: { id?: string; size: string; color: string; sku: string; price: any; stock: number }[];
};

interface ImageField {
  url: string;
  altText: string;
  isPrimary: boolean;
}

interface VariantField {
  id?: string;
  size: string;
  color: string;
  sku: string;
  price: string;
  stock: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: ExistingProduct;
}) {
  const isEditMode = !!product;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEditMode);
  const [description, setDescription] = useState(product?.description ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    product?.metaDescription ?? ""
  );
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const [images, setImages] = useState<ImageField[]>(
    product?.images.length
      ? product.images.map((img) => ({
          url: img.url,
          altText: img.altText ?? "",
          isPrimary: img.isPrimary,
        }))
      : [{ url: "", altText: "", isPrimary: true }]
  );

  const [variants, setVariants] = useState<VariantField[]>(
    product?.variants.length
      ? product.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          sku: v.sku,
          price: String(v.price),
          stock: String(v.stock),
        }))
      : [{ size: "", color: "", sku: "", price: "", stock: "0" }]
  );

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugEdited) setSlug(slugify(val));
  }

  function handleSlugChange(val: string) {
    setSlugEdited(true);
    setSlug(slugify(val));
  }

  function addImage() {
    setImages((prev) => [...prev, { url: "", altText: "", isPrimary: false }]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length && !next.some((img) => img.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  }

  function updateImage(
    index: number,
    field: keyof ImageField,
    value: string | boolean
  ) {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, [field]: value } : img))
    );
  }

  function setPrimaryImage(index: number) {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isPrimary: i === index }))
    );
  }

  async function handleFileUpload(
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      updateImage(index, "url", data.url);
    } catch (err) {
      console.error("Failed to upload image");
    } finally {
      setUploadingIndex(null);
    }
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { size: "", color: "", sku: "", price: "", stock: "0" },
    ]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariant(
    index: number,
    field: keyof VariantField,
    value: string
  ) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const payload: CreateProductInput = {
      name,
      slug,
      description,
      brand: brand || undefined,
      categoryId,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      isActive,
      images: images
        .filter((img) => img.url.trim() !== "")
        .map((img, i) => ({
          url: img.url,
          altText: img.altText || undefined,
          isPrimary: img.isPrimary,
          position: i,
        })),
      variants: variants
        .filter((v) => v.sku.trim() !== "")
        .map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          sku: v.sku,
          price: parseFloat(v.price) || 0,
          stock: parseInt(v.stock) || 0,
        })),
    };

    startTransition(async () => {
      const result = isEditMode
        ? await updateProduct({ ...payload, id: product!.id })
        : await createProduct(payload);

      if (result && !result.success) {
        setErrors(result.error);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: "Please fix the form errors before saving.",
              type: "error",
            },
          })
        );
      } else {
        setSavedSuccess(true);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: isEditMode
                ? "Product changes saved successfully!"
                : "New product created successfully!",
              type: "success",
            },
          })
        );
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    });
  }

  const inputClass =
    "h-11 w-full rounded-md border border-[#1E2A38]/10 bg-[#EFECE6] px-3.5 text-sm text-[#1E2A38] placeholder:text-[#1E2A38]/35 outline-none transition focus:border-[#89B4D9] focus:ring-1 focus:ring-[#89B4D9]";
  const labelClass =
    "mb-1.5 block text-[11px] font-medium tracking-wide text-[#1E2A38]";

  return (
    <div className="mx-auto max-w-[1100px] pb-28">
      {/* ── Header ── */}
      <div className="mb-10">
        <Link
          href="/admin/products"
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-[#1E2A38]/50 transition hover:text-[#1E2A38]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Products
        </Link>

        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#1E2A38]/45">
          Products / {isEditMode ? "Edit" : "New Product"}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[36px] leading-tight tracking-tight text-[#1E2A38] md:text-[40px]">
          {isEditMode ? "Edit Product" : "Add New Product"}
        </h1>
        <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-[#1E2A38]/55">
          {isEditMode
            ? "Update this product listing."
            : "Create a new product for your store."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-14">
        {/* ── Product Information ── */}
        <section>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1E2A38]">
            Product Information
          </h2>
          <div className="mb-6 h-px bg-[#1E2A38]/10" />

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelClass}>
                Product Name <span className="text-[#1E2A38]/40">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Air Zoom Pulse"
                className={inputClass}
                required
                aria-invalid={!!errors.name}
              />
              {errors.name && <FieldError msg={errors.name} />}
            </div>

            <div>
              <label className={labelClass}>
                Slug <span className="text-[#1E2A38]/40">*</span>
              </label>
              <Input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="air-zoom-pulse"
                className={`${inputClass} font-mono text-[13px]`}
                required
                aria-invalid={!!errors.slug}
              />
              {errors.slug && <FieldError msg={errors.slug} />}
            </div>

            <div>
              <label className={labelClass}>Brand</label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Nike"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Category <span className="text-[#1E2A38]/40">*</span>
              </label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                  required
                >
                  <option value="" disabled className="text-[#1E2A38]/35">
                    Select category
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="text-[#1E2A38]">
                      {cat.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1E2A38]/50" />
              </div>
              {errors.categoryId && <FieldError msg={errors.categoryId} />}
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                Description <span className="text-[#1E2A38]/40">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Detailed product description…"
                className="w-full resize-none rounded-md border border-[#1E2A38]/10 bg-[#EFECE6] px-3.5 py-3 text-sm leading-relaxed text-[#1E2A38] placeholder:text-[#1E2A38]/35 outline-none transition focus:border-[#89B4D9] focus:ring-1 focus:ring-[#89B4D9]"
                required
                aria-invalid={!!errors.description}
              />
              {errors.description && <FieldError msg={errors.description} />}
            </div>
          </div>
        </section>

        {/* ── Product Images ── */}
        <section>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1E2A38]">
            Product Images
          </h2>
          <div className="mb-6 h-px bg-[#1E2A38]/10" />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, i) => (
              <div key={i} className="group relative">
                {img.url ? (
                  <div className="relative aspect-square overflow-hidden rounded-md border border-[#1E2A38]/10 bg-[#EFECE6]">
                    <img
                      src={img.url}
                      alt={img.altText || `Product image ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {img.isPrimary && (
                      <span className="absolute left-2 top-2 rounded bg-[#1E2A38]/85 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#F5F2EB]">
                        MAIN
                      </span>
                    )}
                    <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/40 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      {!img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(i)}
                          className="rounded bg-white/90 px-2 py-1 text-[10px] font-medium text-[#1E2A38]"
                        >
                          Set main
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="ml-auto rounded bg-white/90 p-1 text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#1E2A38]/15 bg-[#EFECE6] transition hover:border-[#89B4D9]/60 hover:bg-[#E6E0D4]/40">
                    {uploadingIndex === i ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#1E2A38]/40" />
                    ) : (
                      <Upload className="h-5 w-5 text-[#1E2A38]/30" />
                    )}
                    <span className="text-[11px] text-[#1E2A38]/45">
                      {uploadingIndex === i ? "Uploading…" : "Upload"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(i, e)}
                    />
                  </label>
                )}

                {img.url && (
                  <Input
                    value={img.altText}
                    onChange={(e) => updateImage(i, "altText", e.target.value)}
                    placeholder="Alt text"
                    className="mt-1.5 h-8 rounded border border-[#1E2A38]/10 bg-transparent px-2 text-[12px] text-[#1E2A38] placeholder:text-[#1E2A38]/30 focus:border-[#89B4D9] focus:ring-0"
                  />
                )}
              </div>
            ))}

            {/* Add image slot */}
            <button
              type="button"
              onClick={addImage}
              disabled={uploadingIndex !== null}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-[#1E2A38]/15 text-[#1E2A38]/40 transition hover:border-[#89B4D9]/50 hover:text-[#89B4D9]"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[11px]">Add image</span>
            </button>
          </div>
          {errors.images && <FieldError msg={errors.images} />}
        </section>

        {/* ── Variants ── */}
        <section>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1E2A38]">
              Variants
            </h2>
          </div>
          <div className="mb-4 h-px bg-[#1E2A38]/10" />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#1E2A38]/10 text-[10px] font-semibold uppercase tracking-wider text-[#1E2A38]/50">
                  <th className="pb-2.5 pr-3 font-medium">Size</th>
                  <th className="pb-2.5 pr-3 font-medium">Color</th>
                  <th className="pb-2.5 pr-3 font-medium">SKU</th>
                  <th className="pb-2.5 pr-3 font-medium">Price</th>
                  <th className="pb-2.5 pr-3 font-medium">Stock</th>
                  <th className="w-10 pb-2.5" />
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#1E2A38]/06 last:border-0"
                  >
                    <td className="py-2.5 pr-3">
                      <Input
                        value={v.size}
                        onChange={(e) =>
                          updateVariant(i, "size", e.target.value)
                        }
                        placeholder="42"
                        className="h-9 rounded border border-[#1E2A38]/10 bg-[#EFECE6] px-2.5 text-sm text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Input
                        value={v.color}
                        onChange={(e) =>
                          updateVariant(i, "color", e.target.value)
                        }
                        placeholder="White"
                        className="h-9 rounded border border-[#1E2A38]/10 bg-[#EFECE6] px-2.5 text-sm text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Input
                        value={v.sku}
                        onChange={(e) =>
                          updateVariant(i, "sku", e.target.value)
                        }
                        placeholder="SHOE-42-W"
                        className="h-9 rounded border border-[#1E2A38]/10 bg-[#EFECE6] px-2.5 font-mono text-[13px] text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#1E2A38]/40">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.price}
                          onChange={(e) =>
                            updateVariant(i, "price", e.target.value)
                          }
                          placeholder="129.00"
                          className="h-9 rounded border border-[#1E2A38]/10 bg-[#EFECE6] pl-6 pr-2.5 text-sm text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) =>
                          updateVariant(i, "stock", e.target.value)
                        }
                        placeholder="0"
                        className="h-9 rounded border border-[#1E2A38]/10 bg-[#EFECE6] px-2.5 text-sm text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                      />
                    </td>
                    <td className="py-2.5">
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariant(i)}
                          className="rounded p-1.5 text-[#1E2A38]/30 transition hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Remove variant"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addVariant}
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1E2A38]/55 transition hover:text-[#89B4D9]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Variant
          </button>
          {errors.variants && <FieldError msg={errors.variants} />}
        </section>

        {/* ── SEO ── */}
        <section>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1E2A38]">
            SEO
          </h2>
          <div className="mb-6 h-px bg-[#1E2A38]/10" />

          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className={labelClass}>Meta Title</label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Page title for search engines"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={2}
                placeholder="Brief description for search results"
                className="w-full resize-none rounded-md border border-[#1E2A38]/10 bg-[#EFECE6] px-3.5 py-3 text-sm text-[#1E2A38] placeholder:text-[#1E2A38]/35 outline-none transition focus:border-[#89B4D9] focus:ring-1 focus:ring-[#89B4D9]"
              />
            </div>
          </div>
        </section>

        {/* ── Status ── */}
        <section>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1E2A38]">
            Status
          </h2>
          <div className="mb-5 h-px bg-[#1E2A38]/10" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                isActive ? "bg-[#1E2A38]" : "bg-[#1E2A38]/20"
              }`}
            >
              <span
                className={`pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  isActive ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-[13px] text-[#1E2A38]/70">
              {isActive ? "Active — visible on store" : "Draft — hidden from store"}
            </span>
          </div>
        </section>

   {/* ── Sticky Footer ── */}
<div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1E2A38]/10 bg-[#F5F2EB]/95 backdrop-blur-sm">
  <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-3.5">
    {isEditMode ? (
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        disabled={isPending}
        className="h-10 rounded-md px-4 text-[13px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
      >
        Delete Product
      </button>
    ) : (
      <span />
    )}

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => router.push("/admin/products")}
        disabled={isPending}
        className="h-10 rounded-md px-5 text-[13px] font-medium text-[#1E2A38]/60 transition hover:text-[#1E2A38] disabled:opacity-50"
      >
        Cancel
      </button>
      <Button
        type="submit"
        disabled={isPending}
        className={`h-10 rounded-md px-6 text-[13px] font-medium transition-all duration-300 ${
          savedSuccess
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-[#1E2A38] text-[#F5F2EB] hover:bg-[#89B4D9] hover:text-[#1E2A38]"
        } disabled:opacity-60`}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {isEditMode ? "Saving…" : "Creating…"}
          </span>
        ) : savedSuccess ? (
          <span className="flex items-center gap-1.5 font-bold">
            <Check className="h-4 w-4 text-white" /> Saved Successfully!
          </span>
        ) : isEditMode ? (
          "Save Changes"
        ) : (
          "Create Product"
        )}
      </Button>
    </div>
  </div>
</div>

{/* ── Delete Confirmation Dialog ── */}
{isEditMode && (
  <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
    <DialogContent className="max-w-[400px] gap-0 overflow-hidden rounded-lg border border-[#1E2A38]/10 bg-[#F5F2EB] p-0 shadow-lg">
      <div className="px-6 pt-6 pb-5">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight text-[#1E2A38]">
            Delete this product?
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-[#1E2A38]/60">
            This will remove{" "}
            <span className="font-medium text-[#1E2A38]">{name}</span> from
            the store. It won’t be permanently deleted past orders
            referencing it will remain intact.
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[#1E2A38]/10 bg-[#EFECE6]/60 px-6 py-3.5">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(false)}
          disabled={isPending}
          className="h-9 rounded-md px-4 text-[13px] font-medium text-[#1E2A38]/60 transition hover:text-[#1E2A38] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await deleteProduct(product!.id);
            });
          }}
          className="h-9 rounded-md bg-rose-600 px-4 text-[13px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
        >
          {isPending ? "Deleting…" : "Delete Product"}
        </button>
      </div>
    </DialogContent>
  </Dialog>
)}
      </form>
    </div>
  );
}

function FieldError({ msg }: { msg: string[] }) {
  return (
    <p className="mt-1.5 text-[12px] text-rose-600" role="alert">
      {msg.join(", ")}
    </p>
  );
}