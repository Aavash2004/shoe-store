import { notFound } from "next/navigation";
import Link from "next/link";
import { placeholderProducts } from "@/lib/placeholder-data";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductDetailInteractive } from "@/components/product/ProductDetailInteractive";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = placeholderProducts.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-[var(--color-navy)]/50">
        <Link href="/shop" className="hover:text-[var(--color-navy)] transition-colors">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-navy)]/70">{product.category}</span>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-navy)]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div className="min-h-[400px] md:min-h-[540px]">
          <ProductGallery
            images={product.images}
          />
        </div>

        {/* Product info */}
        <div className="flex flex-col justify-center lg:sticky lg:top-28 lg:self-start">
          <ProductDetailInteractive product={product} />
        </div>
      </div>
    </div>
  );
}