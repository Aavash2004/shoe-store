import { notFound } from "next/navigation";
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
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div className="min-h-[420px] md:min-h-[560px]">
          <ProductGallery
            images={product.images}
            alt={product.name}
          />
        </div>

        {/* Product info + interactive controls */}
        <div className="flex flex-col justify-center">
          <ProductDetailInteractive product={product} />
        </div>
      </div>
    </div>
  );
}