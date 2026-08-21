"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  images: string[];
  alt?: string;
}

export function ProductGallery({ images, alt = "Product image" }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Fallback if no images are provided
  const safeImages = images?.length > 0 ? images : ["/images/placeholder-shoe.jpg"];

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--color-cream-alt)]">
        <Image
          src={safeImages[activeIndex]}
          alt={`${alt} - view ${activeIndex + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-6 transition-opacity duration-300"
        />
      </div>

      {/* Thumbnails */}
      {safeImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {safeImages.map((src, index) => (
            <button
              key={src + index}
              onClick={() => setActiveIndex(index)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                index === activeIndex
                  ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20"
                  : "border-[var(--color-sand)] hover:border-[var(--color-navy)]/30"
              }`}
            >
              <Image
                src={src}
                alt={`${alt} thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}