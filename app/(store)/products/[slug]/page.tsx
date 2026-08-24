import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductDetailInteractive } from "@/components/product/ProductDetailInteractive";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true } },
    },
  });

  if (!product) {
    notFound();
  }

  const sizes = Array.from(new Set(product.variants.map((v) => v.size))).sort();
  const colors = Array.from(new Set(product.variants.map((v) => v.color)));
  const minPrice = product.variants.length
    ? Math.min(...product.variants.map((v) => Number(v.price)))
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <ProductGallery
          images={product.images.map((img) => img.url)}
        />
        <ProductDetailInteractive
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: minPrice,
            image: product.images[0]?.url ?? "",
            category: product.category.name,
            brand: product.brand ?? "Unknown",
            description: product.description,
            images: product.images.map((img) => img.url),
            sizes,
            colors,
              variants: product.variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      price: Number(v.price),
      stock: v.stock,
              })),
          }}
        />
      </div>
    </div>
  );
}