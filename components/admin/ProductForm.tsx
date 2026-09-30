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
  Layers,
  Sparkles,
  Settings2,
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
import {
  generateVariantMatrix,
  parseSizeRange,
  generateBaseSku,
} from "@/lib/utils/variant-generator";

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
  isManualSku?: boolean;
}

const COMMON_SHOE_SIZES = [
  "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function compressImage(file: File, maxWidth = 1600, quality = 0.85): Promise<File> {
  if (
    typeof window === "undefined" ||
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const optimizedFile = new File([blob], cleanName, {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
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
          isManualSku: false,
        }))
      : [{ size: "", color: "", sku: "", price: "", stock: "0", isManualSku: false }]
  );

  // ── Variant Generator State ──
  const initialColors = Array.from(
    new Set(
      (product?.variants || [])
        .map((v) => v.color?.trim())
        .filter((c): c is string => Boolean(c))
    )
  );
  const [generatorColors, setGeneratorColors] = useState<string[]>(initialColors);
  const [colorInput, setColorInput] = useState<string>("");

  const initialSizes = Array.from(
    new Set(
      (product?.variants || [])
        .map((v) => v.size?.trim())
        .filter((s): s is string => Boolean(s))
    )
  );
  const [generatorSizes, setGeneratorSizes] = useState<string[]>(initialSizes);
  const [sizeRangeInput, setSizeRangeInput] = useState<string>("");

  const initialBasePrice = product?.variants?.[0]?.price
    ? String(product.variants[0].price)
    : "";
  const [basePrice, setBasePrice] = useState<string>(initialBasePrice);

  const [showSkuColumn, setShowSkuColumn] = useState<boolean>(false);
  const [bulkStock, setBulkStock] = useState<string>("");
  const [bulkPrice, setBulkPrice] = useState<string>("");

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

    // Reset input so picking the same file again triggers onChange
    e.target.value = "";

    setUploadingIndex(index);
    try {
      // Pre-compress image client-side to prevent network timeouts with large raw photos
      const fileToUpload = await compressImage(file);

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Upload failed with status ${res.status}`);
      }

      if (data.url) {
        updateImage(index, "url", data.url);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: "Image uploaded successfully!",
              type: "success",
            },
          })
        );
      }
    } catch (err: any) {
      console.error("[Upload Error]:", err);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: err?.message || "Failed to upload image. Please check your credentials/session.",
            type: "error",
          },
        })
      );
    } finally {
      setUploadingIndex(null);
    }
  }

  // ── Generator Chip and Matrix Handlers ──
  function addColorChip() {
    const trimmed = colorInput.trim();
    if (!trimmed) return;
    if (!generatorColors.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setGeneratorColors((prev) => [...prev, trimmed]);
    }
    setColorInput("");
  }

  function removeColorChip(colorToRemove: string) {
    setGeneratorColors((prev) => prev.filter((c) => c !== colorToRemove));
  }

  function handleColorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addColorChip();
    }
  }

  function toggleSizeChip(sz: string) {
    const trimmed = sz.trim();
    if (!trimmed) return;
    setGeneratorSizes((prev) => {
      const exists = prev.includes(trimmed);
      const next = exists ? prev.filter((s) => s !== trimmed) : [...prev, trimmed];
      return next.sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
    });
  }

  function applySizeRange() {
    if (!sizeRangeInput.trim()) return;
    const parsed = parseSizeRange(sizeRangeInput);
    if (parsed.length > 0) {
      setGeneratorSizes((prev) => {
        const merged = Array.from(new Set([...prev, ...parsed]));
        return merged.sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        });
      });
      setSizeRangeInput("");
    } else {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: 'Invalid size range. Use format like "38-45".',
            type: "error",
          },
        })
      );
    }
  }

  function handleGenerateMatrix() {
    if (generatorColors.length === 0 || generatorSizes.length === 0) {
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: "Please choose at least 1 color and 1 size to generate variants.",
            type: "error",
          },
        })
      );
      return;
    }

    const nextVariants = generateVariantMatrix({
      colors: generatorColors,
      sizes: generatorSizes,
      existingVariants: variants.filter((v) => v.color && v.size),
      basePrice: basePrice || "0",
      productName: name || "SHOE",
    });

    setVariants(nextVariants);

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message: `Generated ${nextVariants.length} variants (${generatorColors.length} colors × ${generatorSizes.length} sizes).`,
          type: "success",
        },
      })
    );
  }

  function applyBulkStock() {
    if (bulkStock === "" || isNaN(parseInt(bulkStock))) return;
    const cleanStock = String(Math.max(0, parseInt(bulkStock)));
    setVariants((prev) => prev.map((v) => ({ ...v, stock: cleanStock })));
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message: `Updated stock to ${cleanStock} for all variants.`,
          type: "success",
        },
      })
    );
  }

  function applyBulkPrice() {
    if (bulkPrice === "" || isNaN(parseFloat(bulkPrice))) return;
    const cleanPrice = String(Math.max(0, parseFloat(bulkPrice)));
    setVariants((prev) => prev.map((v) => ({ ...v, price: cleanPrice })));
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message: `Updated price to $${cleanPrice} for all variants.`,
          type: "success",
        },
      })
    );
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        size: "",
        color: "",
        sku: generateBaseSku(name || "SHOE", "GEN", String(prev.length + 1)),
        price: basePrice || "0",
        stock: "0",
        isManualSku: false,
      },
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
      prev.map((v, i) => {
        if (i !== index) return v;
        if (field === "sku") {
          return {
            ...v,
            sku: value.toUpperCase(),
            isManualSku: true,
          };
        }
        return { ...v, [field]: value };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const sanitizedVariants = variants
      .filter((v) => v.size && v.color)
      .map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        size: v.size.trim(),
        color: v.color.trim(),
        sku: (v.sku && v.sku.trim() ? v.sku.trim() : generateBaseSku(name || "SHOE", v.color, v.size)).toUpperCase(),
        price: parseFloat(v.price) >= 0 ? parseFloat(v.price) : 0,
        stock: parseInt(v.stock) >= 0 ? parseInt(v.stock) : 0,
        isManualSku: Boolean(v.isManualSku),
      }));

    if (sanitizedVariants.length === 0) {
      setErrors({
        variants: ["At least one variant (with valid size and color) is required."],
      });
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: "At least one variant is required.",
            type: "error",
          },
        })
      );
      return;
    }

    // Validate duplicate color + size pairs
    const pairSeen = new Set<string>();
    for (const v of sanitizedVariants) {
      const key = `${v.color.toLowerCase()}:::${v.size.toLowerCase()}`;
      if (pairSeen.has(key)) {
        setErrors({
          variants: [
            `Duplicate variant detected for Color "${v.color}" and Size "${v.size}". Each variant must have a unique color and size combination.`,
          ],
        });
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message: `Duplicate variant detected: ${v.color} / Size ${v.size}`,
              type: "error",
            },
          })
        );
        return;
      }
      pairSeen.add(key);
    }

    const payload: CreateProductInput = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      ...(brand.trim() ? { brand: brand.trim() } : {}),
      categoryId,
      ...(metaTitle.trim() ? { metaTitle: metaTitle.trim() } : {}),
      ...(metaDescription.trim() ? { metaDescription: metaDescription.trim() } : {}),
      isActive,
      images: images
        .filter((img) => img.url && img.url.trim() !== "")
        .map((img, i) => ({
          url: img.url,
          ...(img.altText && img.altText.trim() ? { altText: img.altText.trim() } : {}),
          isPrimary: img.isPrimary,
          position: i,
        })),
      variants: sanitizedVariants,
    };

    // Check for duplicate SKUs in the variants list before submission
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const v of variants) {
      const s = v.sku.trim().toLowerCase();
      if (!s) continue;
      if (seen.has(s)) {
        dupes.push(v.sku.trim());
      } else {
        seen.add(s);
      }
    }

    if (dupes.length > 0) {
      setErrors({
        variants: [
          `Duplicate SKU "${dupes[0]}" detected in variants. Each variant must have a unique SKU across the store.`,
        ],
      });
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: `Duplicate SKU "${dupes[0]}" detected in variants. Each variant must be unique.`,
            type: "error",
          },
        })
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = isEditMode
          ? await updateProduct({ ...payload, id: product!.id })
          : await createProduct(payload);

        if (result && !result.success) {
          setErrors(result.error);
          const firstErrorMsg =
            Object.values(result.error || {}).flat()[0] ||
            "Please fix the form errors before saving.";
          window.dispatchEvent(
            new CustomEvent("show-toast", {
              detail: {
                message: firstErrorMsg,
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
          if (!isEditMode && result && "productId" in result && result.productId) {
            router.push(`/admin/products/${result.productId}`);
          }
        }
      } catch (err: any) {
        console.error("[ProductForm Submit Error]:", err);
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: {
              message:
                err?.message || "An unexpected error occurred while saving the product.",
              type: "error",
            },
          })
        );
      }
    });
  }

  const inputClass =
    "h-11 w-full rounded-md border border-[#1E2A38]/10 bg-[var(--color-cream-alt)] px-3.5 text-sm text-[#1E2A38] placeholder:text-[#1E2A38]/35 outline-none transition focus:border-[#89B4D9] focus:ring-1 focus:ring-[#89B4D9]";
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
                className="w-full resize-none rounded-md border border-[#1E2A38]/10 bg-[var(--color-cream-alt)] px-3.5 py-3 text-sm leading-relaxed text-[#1E2A38] placeholder:text-[#1E2A38]/35 outline-none transition focus:border-[#89B4D9] focus:ring-1 focus:ring-[#89B4D9]"
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
                  <div className="relative aspect-square overflow-hidden rounded-md border border-[#1E2A38]/10 bg-[var(--color-cream-alt)]">
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
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#1E2A38]/15 bg-[var(--color-cream-alt)] transition hover:border-[#89B4D9]/60 hover:bg-slate-100">
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
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1E2A38]">
                Variants
              </h2>
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#1E2A38]/10 text-[#1E2A38]">
                {variants.length}
              </span>
            </div>
          </div>
          <div className="mb-4 h-px bg-[#1E2A38]/10" />

          {/* ── Variant Generator Panel ── */}
          <div className="mb-6 rounded-xl border border-[#1E2A38]/12 bg-[var(--color-cream-alt)] p-4 sm:p-5 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1E2A38]/08 pb-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1E2A38]">
                  <Sparkles className="w-4 h-4 text-[#89B4D9]" />
                  <span>Variant Matrix Generator</span>
                </div>
                <p className="text-[12px] text-[#1E2A38]/60 mt-0.5">
                  Pick colors and shoe sizes to automatically generate the full variant matrix. Existing stock and prices are preserved on regeneration.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-semibold text-[#1E2A38]/70">Base Price:</label>
                <div className="relative w-28">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#1E2A38]/40">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="0.00"
                    className="h-8 pl-6 pr-2 text-xs bg-[var(--color-cream)] border border-[#1E2A38]/15 rounded-md text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Colors Chip Input */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E2A38]/70">
                1. Colors ({generatorColors.length})
              </label>
              <div className="flex flex-wrap items-center gap-1.5 min-h-[42px] p-2 rounded-lg border border-[#1E2A38]/15 bg-[var(--color-cream)] focus-within:border-[#89B4D9]">
                {generatorColors.map((color) => (
                  <span
                    key={color}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#1E2A38]/08 text-[#1E2A38]"
                  >
                    {color}
                    <button
                      type="button"
                      onClick={() => removeColorChip(color)}
                      className="text-[#1E2A38]/50 hover:text-rose-600 transition"
                      aria-label={`Remove color ${color}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={handleColorKeyDown}
                  placeholder={
                    generatorColors.length === 0
                      ? "Type a color and press Enter (e.g. Black, White, Red)…"
                      : "Add more colors…"
                  }
                  className="flex-1 min-w-[170px] bg-transparent text-xs text-[#1E2A38] placeholder:text-[#1E2A38]/40 outline-none px-1"
                />
                {colorInput.trim() && (
                  <button
                    type="button"
                    onClick={addColorChip}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#1E2A38] text-white rounded hover:bg-[#1E2A38]/90 transition"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>

            {/* Sizes Selection */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1E2A38]/70">
                  2. Shoe Sizes ({generatorSizes.length})
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={sizeRangeInput}
                    onChange={(e) => setSizeRangeInput(e.target.value)}
                    placeholder="Range: e.g. 38-45"
                    className="h-7 w-32 px-2 text-[11px] bg-[var(--color-cream)] border border-[#1E2A38]/15 rounded text-[#1E2A38] placeholder:text-[#1E2A38]/40 outline-none"
                  />
                  <button
                    type="button"
                    onClick={applySizeRange}
                    className="h-7 px-2.5 text-[11px] font-semibold bg-[#1E2A38]/10 hover:bg-[#1E2A38]/20 text-[#1E2A38] rounded transition"
                  >
                    Add Range
                  </button>
                </div>
              </div>

              {/* Quick-Pick Common Sizes */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {COMMON_SHOE_SIZES.map((sz) => {
                  const isSelected = generatorSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSizeChip(sz)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                        isSelected
                          ? "bg-[#1E2A38] text-white border-[#1E2A38] shadow-sm"
                          : "bg-[var(--color-cream)] text-[#1E2A38]/70 border-[#1E2A38]/15 hover:border-[#1E2A38]/40"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>

              {/* Custom sizes not in quick-pick list */}
              {generatorSizes.some((sz) => !COMMON_SHOE_SIZES.includes(sz)) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-[#1E2A38]/50">
                    Custom Sizes:
                  </span>
                  {generatorSizes
                    .filter((sz) => !COMMON_SHOE_SIZES.includes(sz))
                    .map((sz) => (
                      <span
                        key={sz}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded bg-[#1E2A38]/10 text-[#1E2A38]"
                      >
                        {sz}
                        <button
                          type="button"
                          onClick={() => toggleSizeChip(sz)}
                          className="text-[#1E2A38]/50 hover:text-rose-600 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Matrix Generation Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2.5 border-t border-[#1E2A38]/08">
              <div className="text-xs text-[#1E2A38]/60">
                Matrix: <strong className="text-[#1E2A38]">{generatorColors.length}</strong> colors ×{" "}
                <strong className="text-[#1E2A38]">{generatorSizes.length}</strong> sizes ={" "}
                <strong className="text-[#1E2A38]">
                  {generatorColors.length * generatorSizes.length}
                </strong>{" "}
                variants
              </div>
              <Button
                type="button"
                onClick={handleGenerateMatrix}
                disabled={generatorColors.length === 0 || generatorSizes.length === 0}
                className="bg-[#1E2A38] hover:bg-[#1E2A38]/90 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm disabled:opacity-40 flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4" />
                <span>Generate Variants</span>
              </Button>
            </div>
          </div>

          {/* ── Table Controls / Bulk Actions Bar ── */}
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 bg-[var(--color-cream-alt)] border border-[#1E2A38]/10 p-3 rounded-lg shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Bulk Price */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#1E2A38]/70 font-semibold">Set price for all:</span>
                <div className="relative w-24">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#1E2A38]/40">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-7 pl-5 pr-1.5 text-xs bg-[var(--color-cream)] border border-[#1E2A38]/15 rounded text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyBulkPrice}
                  className="h-7 px-2.5 text-[11px] font-semibold bg-[#1E2A38]/10 hover:bg-[#1E2A38]/20 text-[#1E2A38] rounded transition"
                >
                  Apply
                </button>
              </div>

              {/* Bulk Stock */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#1E2A38]/70 font-semibold">Set stock for all:</span>
                <Input
                  type="number"
                  min="0"
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  placeholder="0"
                  className="h-7 w-20 px-2 text-xs bg-[var(--color-cream)] border border-[#1E2A38]/15 rounded text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                />
                <button
                  type="button"
                  onClick={applyBulkStock}
                  className="h-7 px-2.5 text-[11px] font-semibold bg-[#1E2A38]/10 hover:bg-[#1E2A38]/20 text-[#1E2A38] rounded transition"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Toggle SKU Column */}
            <button
              type="button"
              onClick={() => setShowSkuColumn(!showSkuColumn)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
                showSkuColumn
                  ? "bg-[#1E2A38] text-white border-[#1E2A38]"
                  : "bg-[var(--color-cream)] text-[#1E2A38]/70 border-[#1E2A38]/15 hover:border-[#1E2A38]/30"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Edit SKU (advanced)</span>
            </button>
          </div>

          {/* ── Variants Table ── */}
          <div className="overflow-x-auto rounded-lg border border-[#1E2A38]/10 bg-[var(--color-cream-alt)]">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#1E2A38]/10 text-[10px] font-semibold uppercase tracking-wider text-[#1E2A38]/50 bg-[#1E2A38]/03">
                  <th className="py-2.5 pl-3 pr-3 font-semibold">Color</th>
                  <th className="py-2.5 pr-3 font-semibold">Size</th>
                  <th className="py-2.5 pr-3 font-semibold">Price ($)</th>
                  <th className="py-2.5 pr-3 font-semibold">Stock</th>
                  {showSkuColumn && (
                    <th className="py-2.5 pr-3 font-semibold">
                      SKU <span className="text-[9px] text-[#1E2A38]/40 lowercase">(auto-generated)</span>
                    </th>
                  )}
                  <th className="w-10 py-2.5 pr-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2A38]/06">
                {variants.map((v, i) => (
                  <tr key={i} className="hover:bg-[#1E2A38]/02 transition-colors">
                    <td className="py-2.5 pl-3 pr-3">
                      <Input
                        value={v.color}
                        onChange={(e) => updateVariant(i, "color", e.target.value)}
                        placeholder="e.g. Black"
                        className="h-9 rounded border border-[#1E2A38]/12 bg-[var(--color-cream)] px-2.5 text-xs text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Input
                        value={v.size}
                        onChange={(e) => updateVariant(i, "size", e.target.value)}
                        placeholder="e.g. 42"
                        className="h-9 w-24 rounded border border-[#1E2A38]/12 bg-[var(--color-cream)] px-2.5 text-xs text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="relative w-32">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#1E2A38]/40">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.price}
                          onChange={(e) => updateVariant(i, "price", e.target.value)}
                          placeholder="0.00"
                          className="h-9 rounded border border-[#1E2A38]/12 bg-[var(--color-cream)] pl-6 pr-2 text-xs text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) => updateVariant(i, "stock", e.target.value)}
                        placeholder="0"
                        className="h-9 w-28 rounded border border-[#1E2A38]/12 bg-[var(--color-cream)] px-2.5 text-xs text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                      />
                    </td>
                    {showSkuColumn && (
                      <td className="py-2.5 pr-3">
                        <Input
                          value={v.sku}
                          onChange={(e) => updateVariant(i, "sku", e.target.value)}
                          placeholder="AJ1-BLK-42"
                          className="h-9 rounded border border-[#1E2A38]/12 bg-[var(--color-cream)] px-2.5 font-mono text-xs text-[#1E2A38] focus:border-[#89B4D9] focus:ring-0"
                        />
                      </td>
                    )}
                    <td className="py-2.5 pr-3 text-right">
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

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1E2A38]/60 transition hover:text-[#1E2A38]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Single Variant</span>
            </button>
            <span className="text-xs text-[#1E2A38]/40">
              {variants.length} variant{variants.length === 1 ? "" : "s"} total
            </span>
          </div>

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
                className="w-full resize-none rounded-md border border-[#1E2A38]/10 bg-[var(--color-cream-alt)] px-3.5 py-3 text-sm text-[#1E2A38] placeholder:text-[#1E2A38]/35 outline-none transition focus:border-[#89B4D9] focus:ring-1 focus:ring-[#89B4D9]"
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
<div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1E2A38]/10 bg-[var(--color-cream)]/95 backdrop-blur-sm">
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
            : "bg-[#1E2A38] text-[var(--color-cream)] hover:bg-[#89B4D9] hover:text-[#1E2A38]"
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
    <DialogContent className="max-w-[400px] gap-0 overflow-hidden rounded-lg border border-[#1E2A38]/10 bg-[var(--color-cream)] p-0 shadow-lg">
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

      <div className="flex items-center justify-end gap-2 border-t border-[#1E2A38]/10 bg-[var(--color-cream-alt)] px-6 py-3.5">
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