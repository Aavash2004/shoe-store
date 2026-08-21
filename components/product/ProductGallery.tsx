"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";

export function ProductGallery({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
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
    <div className="flex flex-col gap-4">
      <div
        ref={mainImageRef}
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-sand"
      >
        <Image
          src={images[activeIndex]}
          alt="Product image"
          fill
          className="object-cover"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, index) => (
            <button
              key={img}
              onClick={() => selectImage(index)}
              className={`relative h-20 w-20 overflow-hidden rounded-md border-2 transition-colors ${
                index === activeIndex ? "border-accent" : "border-sand"
              }`}
            >
              <Image src={img} alt={`Thumbnail ${index + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}