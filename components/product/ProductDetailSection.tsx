"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ProductGallery } from "@/components/product/ProductGallery";
import {
  ProductDetailInteractive,
  type ProductDetailData,
} from "@/components/product/ProductDetailInteractive";

interface ProductDetailSectionProps {
  product: ProductDetailData;
  initialColor?: string | null;
}

export function ProductDetailSection({
  product,
  initialColor,
}: ProductDetailSectionProps) {
  const searchParams = useSearchParams();
  const urlColor = searchParams.get("color");

  // Determine initial color: from URL param ?color=, or initialColor, or first variant color
  const defaultColor =
    urlColor ||
    initialColor ||
    product.colors[0] ||
    null;

  const [selectedColor, setSelectedColor] = useState<string | null>(defaultColor);

  // Sync if URL search params change externally
  useEffect(() => {
    const currentUrlColor = searchParams.get("color");
    if (currentUrlColor && currentUrlColor !== selectedColor) {
      setSelectedColor(currentUrlColor);
    }
  }, [searchParams]);

  function handleColorChange(newColor: string) {
    setSelectedColor(newColor);

    // Update URL query ?color= so links are shareable (without triggering full page reload)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("color", newColor);
      window.history.replaceState(null, "", url.toString());
    }
  }

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
      <ProductGallery
        images={product.galleryImages || product.images}
        selectedColor={selectedColor}
        productName={product.name}
      />
      <ProductDetailInteractive
        product={product}
        externalSelectedColor={selectedColor}
        onColorChange={handleColorChange}
      />
    </div>
  );
}
