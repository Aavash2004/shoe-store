"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Package,
  Image as ImageIcon,
  Search,
  Settings,
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
import type { CreateProductInput } from "@/lib/validations/product";

type Category = { id: string; name: string };

interface ImageField {
  url: string;
  altText: string;
  isPrimary: boolean;
}

interface VariantField {
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

export function ProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [images, setImages] = useState<ImageField[]>([
    { url: "", altText: "", isPrimary: true },
  ]);
  const [variants, setVariants] = useState<VariantField[]>([
    { size: "", color: "", sku: "", price: "", stock: "0" },
  ]);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugEdited) {
      setSlug(slugify(val));
    }
  }

  function handleSlugChange(val: string) {
    setSlugEdited(true);
    setSlug(slugify(val));
  }

  function addImage() {
    setImages((prev) => [
      ...prev,
      { url: "", altText: "", isPrimary: false },
    ]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function updateImage(index: number, field: keyof ImageField, value: string | boolean) {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, [field]: value } : img))
    );
  }

  function setPrimaryImage(index: number) {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, isPrimary: i === index }))
    );
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

  function updateVariant(index: number, field: keyof VariantField, value: string) {
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
          size: v.size,
          color: v.color,
          sku: v.sku,
          price: parseFloat(v.price) || 0,
          stock: parseInt(v.stock) || 0,
        })),
    };

    startTransition(async () => {
      const result = await createProduct(payload);
      if (result && !result.success) {
        setErrors(result.error);
      }
    });
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm text-navy/50 hover:text-navy transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-navy">
          Add New Product
        </h1>
        <p className="mt-1 text-sm text-navy/60">
          Create a new product listing for your store.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Info */}
        <Section icon={Package} title="General Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Product Name</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Classic Leather Oxford"
                className="mt-1.5 h-11 border-sand bg-cream-alt/60 px-4 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
                required
              />
              {errors.name && <ErrorMsg msg={errors.name} />}
            </div>
            <div className="sm:col-span-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="classic-leather-oxford"
                className="mt-1.5 h-11 border-sand bg-cream-alt/60 px-4 text-navy font-mono text-xs placeholder:text-navy/35 focus-visible:ring-accent"
                required
              />
              {errors.slug && <ErrorMsg msg={errors.slug} />}
            </div>
            <div>
              <Label>Brand</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Nike"
                className="mt-1.5 h-11 border-sand bg-cream-alt/60 px-4 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                <SelectTrigger className="mt-1.5 h-11 w-full border-sand bg-cream-alt/60 px-4 text-navy focus-visible:ring-accent">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <ErrorMsg msg={errors.categoryId} />}
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Detailed product description..."
                className="mt-1.5 w-full rounded-lg border border-sand bg-cream-alt/60 px-4 py-3 text-sm text-navy placeholder:text-navy/35 outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
                required
              />
              {errors.description && <ErrorMsg msg={errors.description} />}
            </div>
          </div>
        </Section>

        {/* Images */}
        <Section icon={ImageIcon} title="Product Images">
          <div className="space-y-3">
            {images.map((img, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-lg border border-sand/60 bg-cream-alt/30 p-4 sm:flex-row sm:items-start"
              >
                <div className="flex items-center gap-2 text-navy/30">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-xs font-medium text-navy/40">
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      value={img.url}
                      onChange={(e) => updateImage(i, "url", e.target.value)}
                      placeholder="Image URL (https://...)"
                      className="h-10 border-sand bg-white px-3 text-sm text-navy placeholder:text-navy/30 focus-visible:ring-accent"
                    />
                  </div>
                  <Input
                    value={img.altText}
                    onChange={(e) => updateImage(i, "altText", e.target.value)}
                    placeholder="Alt text (optional)"
                    className="h-10 border-sand bg-white px-3 text-sm text-navy placeholder:text-navy/30 focus-visible:ring-accent"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(i)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        img.isPrimary
                          ? "bg-navy text-cream"
                          : "border border-sand text-navy/60 hover:bg-sand/40"
                      }`}
                    >
                      {img.isPrimary ? "Primary" : "Set Primary"}
                    </button>
                    {images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addImage}
            className="mt-4"
          >
            <Plus className="h-4 w-4" />
            Add Image
          </Button>
          {errors.images && <ErrorMsg msg={errors.images} />}
        </Section>

        {/* Variants */}
        <Section icon={Package} title="Variants">
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-lg border border-sand/60 bg-cream-alt/30 p-4 sm:flex-row sm:items-start"
              >
                <div className="flex items-center gap-2 text-navy/30">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-xs font-medium text-navy/40">
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 grid gap-3 grid-cols-2 sm:grid-cols-5">
                  <Input
                    value={v.size}
                    onChange={(e) => updateVariant(i, "size", e.target.value)}
                    placeholder="Size (e.g. 10)"
                    className="h-10 border-sand bg-white px-3 text-sm text-navy placeholder:text-navy/30 focus-visible:ring-accent"
                  />
                  <Input
                    value={v.color}
                    onChange={(e) => updateVariant(i, "color", e.target.value)}
                    placeholder="Color (e.g. Black)"
                    className="h-10 border-sand bg-white px-3 text-sm text-navy placeholder:text-navy/30 focus-visible:ring-accent"
                  />
                  <Input
                    value={v.sku}
                    onChange={(e) => updateVariant(i, "sku", e.target.value)}
                    placeholder="SKU"
                    className="h-10 border-sand bg-white px-3 text-sm text-navy font-mono placeholder:text-navy/30 focus-visible:ring-accent"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.price}
                    onChange={(e) => updateVariant(i, "price", e.target.value)}
                    placeholder="Price"
                    className="h-10 border-sand bg-white px-3 text-sm text-navy placeholder:text-navy/30 focus-visible:ring-accent"
                  />
                  <Input
                    type="number"
                    min="0"
                    value={v.stock}
                    onChange={(e) => updateVariant(i, "stock", e.target.value)}
                    placeholder="Stock"
                    className="h-10 border-sand bg-white px-3 text-sm text-navy placeholder:text-navy/30 focus-visible:ring-accent"
                  />
                </div>
                <div className="flex items-center sm:mt-0">
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariant}
            className="mt-4"
          >
            <Plus className="h-4 w-4" />
            Add Variant
          </Button>
          {errors.variants && <ErrorMsg msg={errors.variants} />}
        </Section>

        {/* SEO */}
        <Section icon={Search} title="SEO">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Meta Title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Page title for search engines"
                className="mt-1.5 h-11 border-sand bg-cream-alt/60 px-4 text-navy placeholder:text-navy/35 focus-visible:ring-accent"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Meta Description</Label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={2}
                placeholder="Brief description for search results"
                className="mt-1.5 w-full rounded-lg border border-sand bg-cream-alt/60 px-4 py-3 text-sm text-navy placeholder:text-navy/35 outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
              />
            </div>
          </div>
        </Section>

        {/* Status */}
        <Section icon={Settings} title="Status">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                isActive ? "bg-navy" : "bg-sand"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  isActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-navy">
              {isActive ? "Active — visible on store" : "Draft — hidden from store"}
            </span>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-sand pt-6">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Creating..." : "Create Product"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.push("/admin/products")}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-sand bg-white p-6 shadow-xs">
      <div className="flex items-center gap-2.5 mb-5">
        <Icon className="h-4.5 w-4.5 text-navy/40" />
        <h2 className="text-sm font-semibold text-navy">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-medium uppercase tracking-wider text-navy/60">
      {children}
    </label>
  );
}

function ErrorMsg({ msg }: { msg: string[] }) {
  return <p className="mt-1 text-xs text-red-600">{msg.join(", ")}</p>;
}
