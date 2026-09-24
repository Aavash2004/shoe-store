"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  ZoomIn,
  ZoomOut,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
} from "lucide-react";

const LENS_SIZE = 180; // Diameter of the magnifying glass loupe in px
const ZOOM_FACTOR = 2.6; // Magnification power

export function ProductGallery({ images }: { images: string[] }) {
  const safeImages = images?.length ? images : ["/images/Shoes/gmm.jpeg"]; // fallback
  const [activeIndex, setActiveIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const lightboxImgRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Detect touch-enabled device on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(
        window.matchMedia("(pointer: coarse)").matches ||
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0
      );
    }
  }, []);

  // Initial load animation & ScrollTrigger parallax
  useEffect(() => {
    const container = containerRef.current;
    const mainImage = mainImageRef.current;
    const thumbnails = thumbnailsRef.current?.children;

    if (!container || !mainImage) return;

    // Respect prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const ctx = gsap.context(() => {
      // 1. Entrance animation for main image
      gsap.fromTo(
        mainImage,
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }
      );

      // 2. Parallax drift as user scrolls past the gallery
      gsap.to(mainImage, {
        y: 18,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      // 3. Staggered thumbnails reveal
      if (thumbnails && thumbnails.length > 0) {
        gsap.fromTo(
          Array.from(thumbnails),
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.06,
            delay: 0.15,
            ease: "power2.out",
          }
        );
      }
    }, container);

    return () => ctx.revert();
  }, []);

  // Thumbnail selection with crossfade
  function selectImage(index: number) {
    if (index === activeIndex || !mainImageRef.current) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      setActiveIndex(index);
      return;
    }

    gsap.to(mainImageRef.current, {
      opacity: 0.3,
      duration: 0.12,
      ease: "power2.in",
      onComplete: () => {
        setActiveIndex(index);
        gsap.to(mainImageRef.current, {
          opacity: 1,
          duration: 0.22,
          ease: "power2.out",
        });
      },
    });
  }

  // High-performance direct DOM manipulation for the Magnifying Glass (0 React re-renders)
  const updateLoupe = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!loupeRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const percentY = Math.max(0, Math.min(100, (y / rect.height) * 100));

    loupeRef.current.style.transform = `translate3d(${x - LENS_SIZE / 2}px, ${
      y - LENS_SIZE / 2
    }px, 0)`;
    loupeRef.current.style.backgroundPosition = `${percentX}% ${percentY}%`;
    loupeRef.current.style.backgroundSize = `${rect.width * ZOOM_FACTOR}px ${
      rect.height * ZOOM_FACTOR
    }px`;
  }, []);

  // Lightbox keyboard navigation & body scroll lock
  useEffect(() => {
    if (!showLightbox) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLightbox(false);
      } else if (e.key === "ArrowRight") {
        setActiveIndex((prev) => (prev + 1) % safeImages.length);
      } else if (e.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showLightbox, safeImages.length]);

  // Handle lightbox zoom pan via direct DOM manipulation (0 React re-renders)
  const handleLightboxMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lightboxZoomed || !lightboxImgRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    lightboxImgRef.current.style.transformOrigin = `${x}% ${y}%`;
  };

  const currentImgUrl = safeImages[activeIndex];

  return (
    <>
      <div ref={containerRef} className="flex flex-col gap-4">
        {/* Main Image Container */}
        <div
          ref={mainImageRef}
          onMouseEnter={(e) => {
            if (!isTouchDevice) {
              updateLoupe(e);
              setIsHovering(true);
            }
          }}
          onMouseLeave={() => {
            setIsHovering(false);
          }}
          onMouseMove={updateLoupe}
          onClick={() => {
            setLightboxZoomed(false);
            setShowLightbox(true);
          }}
          className={`group relative aspect-square w-full select-none overflow-hidden rounded-sm bg-[var(--color-sand)] border border-[var(--color-sand)]/70 ${
            isTouchDevice ? "cursor-pointer" : isHovering ? "cursor-none" : "cursor-crosshair"
          }`}
          aria-label="Product image with magnifying glass loupe. Click to inspect in full screen"
        >
          {/* Base Image (Fixed at normal 1x scale) */}
          <Image
            src={currentImgUrl}
            alt="Product view"
            fill
            className="object-cover pointer-events-none transition-transform duration-300"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          {/* ── Magnifying Glass Circular Loupe (Hardware accelerated direct DOM) ── */}
          {!isTouchDevice && (
            <div
              ref={loupeRef}
              className={`pointer-events-none absolute top-0 left-0 z-20 rounded-full border-[3px] border-white shadow-[0_14px_36px_rgba(0,0,0,0.38),0_0_0_1px_rgba(30,42,56,0.18)] overflow-hidden will-change-transform transition-opacity duration-150 ${
                isHovering ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
              }`}
              style={{
                width: `${LENS_SIZE}px`,
                height: `${LENS_SIZE}px`,
                backgroundImage: `url(${currentImgUrl})`,
                backgroundRepeat: "no-repeat",
              }}
            >
              {/* Optical Glass Lens Reflection Sheen */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/35 pointer-events-none" />

              {/* Center Reticle Target Indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-2 w-2 rounded-full border border-white/90 bg-black/20 shadow-xs" />
              </div>

              {/* Power Pill Badge */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase backdrop-blur-xs shadow-xs">
                {ZOOM_FACTOR}× Lens
              </div>
            </div>
          )}

          {/* Floating Subtle Lens Cue Badge */}
          <div
            className={`pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-md border border-[var(--color-sand)]/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-navy)]/80 shadow-2xs backdrop-blur-xs transition-all duration-200 ${
              isHovering && !isTouchDevice ? "opacity-0 translate-y-1" : "opacity-90"
            }`}
          >
            {isTouchDevice ? (
              <>
                <Maximize2 className="h-3 w-3 text-[var(--color-navy)]" />
                <span>Tap to expand</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-[var(--color-sky)]" />
                <span>Move cursor to magnify</span>
              </>
            )}
          </div>
        </div>

        {/* Thumbnails Strip */}
        {safeImages.length > 1 && (
          <div ref={thumbnailsRef} className="flex gap-2.5">
            {safeImages.map((img, index) => (
              <button
                key={img + index}
                type="button"
                onClick={() => selectImage(index)}
                className={`relative h-20 w-20 overflow-hidden rounded-xs border transition-all ${
                  index === activeIndex
                    ? "border-[var(--color-navy)] ring-1 ring-[var(--color-navy)]"
                    : "border-[var(--color-sand)] hover:border-[var(--color-navy)]/40"
                }`}
                aria-label={`View angle ${index + 1}`}
              >
                <Image
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* High Resolution Lightbox Modal */}
      {showLightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="High resolution image inspection"
          className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-md animate-in fade-in duration-200 select-none"
        >
          {/* Top Bar Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 text-white">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Angle {activeIndex + 1} of {safeImages.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom 1x / 2.5x Toggle */}
              <button
                type="button"
                onClick={() => setLightboxZoomed((z) => !z)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors"
                aria-label={lightboxZoomed ? "Reset zoom" : "Zoom in 2.5x"}
              >
                {lightboxZoomed ? (
                  <>
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span>Zoom Out (1x)</span>
                  </>
                ) : (
                  <>
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Zoom In (2.5x)</span>
                  </>
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                aria-label="Close Lightbox"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Central Image Viewport */}
          <div
            className="relative flex-1 flex items-center justify-center p-4 overflow-hidden"
            onMouseMove={handleLightboxMouseMove}
            onClick={() => setLightboxZoomed((z) => !z)}
          >
            {/* Prev Image Arrow */}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
                }}
                className="absolute left-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors border border-white/10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Next Image Arrow */}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((prev) => (prev + 1) % safeImages.length);
                }}
                className="absolute right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors border border-white/10"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* High-Res Image Display Container */}
            <div
              className={`relative max-w-4xl w-full aspect-square max-h-[80vh] overflow-hidden rounded-md transition-all ${
                lightboxZoomed ? "cursor-move" : "cursor-zoom-in"
              }`}
            >
              <div
                ref={lightboxImgRef}
                className="relative w-full h-full will-change-transform"
                style={{
                  transformOrigin: "50% 50%",
                  transform: lightboxZoomed ? "scale(2.5)" : "scale(1)",
                  transition: lightboxZoomed ? "transform 0.08s ease-out" : "transform 0.25s ease-out",
                }}
              >
                <Image
                  src={currentImgUrl}
                  alt="High resolution product view"
                  fill
                  className="object-contain pointer-events-none"
                  priority
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
              </div>
            </div>
          </div>

          {/* Bottom Strip: Thumbnails */}
          {safeImages.length > 1 && (
            <div className="flex items-center justify-center gap-2.5 py-4 border-t border-white/10 bg-black/40">
              {safeImages.map((img, index) => (
                <button
                  key={img + index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative h-14 w-14 overflow-hidden rounded-xs border transition-all ${
                    index === activeIndex
                      ? "border-white ring-1 ring-white/50 scale-105"
                      : "border-white/30 opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`View photo ${index + 1}`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}