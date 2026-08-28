"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { ZoomIn, X } from "lucide-react";

export function ProductGallery({ images }: { images: string[] }) {
  const safeImages = images?.length ? images : ["/images/Shoes/gmm.jpeg"]; // fallback
  const [activeIndex, setActiveIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const mainImageRef = useRef<HTMLDivElement>(null);

  function selectImage(index: number) {
    if (index === activeIndex) return;
    gsap.to(mainImageRef.current, {
      opacity: 0,
      duration: 0.15,
      onComplete: () => {
        setActiveIndex(index);
        gsap.to(mainImageRef.current, { opacity: 1, duration: 0.25 });
      },
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Main Image Container */}
        <div
          ref={mainImageRef}
          onClick={() => setShowLightbox(true)}
          className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl bg-[var(--color-sand)]"
        >
          <Image
            src={safeImages[activeIndex]}
            alt="Product image"
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority
          />
          <div className="absolute top-3 right-3 p-2 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
            <ZoomIn className="w-4 h-4" />
          </div>
        </div>

        {/* Thumbnails Strip */}
        {safeImages.length > 1 && (
          <div className="flex gap-3">
            {safeImages.map((img, index) => (
              <button
                key={img + index}
                onClick={() => selectImage(index)}
                className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition-all ${
                  index === activeIndex
                    ? "border-[var(--color-navy)] ring-2 ring-[var(--color-navy)]/20"
                    : "border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                }`}
              >
                <Image
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* High Resolution Lightbox Modal */}
      {showLightbox && (
        <div
          onClick={() => setShowLightbox(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button
            onClick={() => setShowLightbox(false)}
            aria-label="Close Lightbox"
            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl aspect-square max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl"
          >
            <Image
              src={safeImages[activeIndex]}
              alt="High resolution product view"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}