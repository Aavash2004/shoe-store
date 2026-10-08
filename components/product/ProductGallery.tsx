"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import {
  ZoomIn,
  ZoomOut,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Sparkles,
} from "lucide-react";
import {
  filterGalleryImages,
  type GalleryImageItem,
} from "@/lib/utils/gallery";
import { getSafeImageUrl } from "@/lib/utils";

const LENS_SIZE = 180; // Diameter of the magnifying glass loupe in px
const ZOOM_FACTOR = 2.6; // Magnification power

export interface ProductGalleryProps {
  images: (GalleryImageItem | string)[];
  selectedColor?: string | null;
  productName?: string;
}

export function ProductGallery({
  images,
  selectedColor,
  productName = "Product",
}: ProductGalleryProps) {
  // Filter and order images based on selected color (color-specific first, then shared, or fallback to all)
  const displayImages = filterGalleryImages(images, selectedColor);
  const rawImages: GalleryImageItem[] = displayImages.length
    ? displayImages
    : [{ url: "/images/Shoes/s05.avif", altText: "Product view", isPrimary: true }];

  const safeImages: GalleryImageItem[] = rawImages.map((img) => ({
    ...img,
    url: getSafeImageUrl(img.url),
  }));

  const [activeIndex, setActiveIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

  // Reset to first image when selected color changes
  useEffect(() => {
    setActiveIndex(0);
  }, [selectedColor]);

  // Ensure activeIndex is within bounds if image count changes
  useEffect(() => {
    if (activeIndex >= safeImages.length) {
      setActiveIndex(0);
    }
  }, [safeImages.length, activeIndex]);

  const containerRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const loupeRef = useRef<HTMLDivElement>(null);
  const lightboxImgRef = useRef<HTMLDivElement>(null);
  const lightboxModalRef = useRef<HTMLDivElement>(null);

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

  // Performance: Preload next image on hover or after current image loads
  useEffect(() => {
    if (typeof window === "undefined" || safeImages.length <= 1) return;
    const nextIdx = (activeIndex + 1) % safeImages.length;
    const nextUrl = safeImages[nextIdx]?.url;
    if (nextUrl) {
      const preloadImg = new window.Image();
      preloadImg.src = nextUrl;
    }
  }, [activeIndex, safeImages]);

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
      opacity: 0.4,
      duration: 0.1,
      ease: "power2.in",
      onComplete: () => {
        setActiveIndex(index);
        gsap.to(mainImageRef.current, {
          opacity: 1,
          duration: 0.2,
          ease: "power2.out",
        });
      },
    });
  }

  function handlePrev() {
    selectImage((activeIndex - 1 + safeImages.length) % safeImages.length);
  }

  function handleNext() {
    selectImage((activeIndex + 1) % safeImages.length);
  }

  // Keyboard navigation on main gallery when focused
  function handleGalleryKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  }

  // Magnifying glass loupe update
  const updateLoupe = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!loupeRef.current) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest("button")) {
      setIsHovering(false);
      return;
    }
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

  // Lightbox keyboard navigation, body scroll lock, and accessibility focus trap
  useEffect(() => {
    if (!showLightbox) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus modal container
    lightboxModalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLightbox(false);
      } else if (e.key === "ArrowRight") {
        setActiveIndex((prev) => (prev + 1) % safeImages.length);
      } else if (e.key === "ArrowLeft") {
        setActiveIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
      } else if (e.key === "Tab") {
        // Focus trap
        if (!lightboxModalRef.current) return;
        const focusable = lightboxModalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showLightbox, safeImages.length]);

  // Handle lightbox zoom pan
  const handleLightboxMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lightboxZoomed || !lightboxImgRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    lightboxImgRef.current.style.transformOrigin = `${x}% ${y}%`;
  };

  // ── Touch Swipe Handling ──
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasSwipedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    hasSwipedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const diffX = e.touches[0].clientX - touchStartRef.current.x;
    const diffY = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(diffX) > 20 && Math.abs(diffX) > Math.abs(diffY)) {
      hasSwipedRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const currentImage = safeImages[activeIndex] || safeImages[0];
  const currentImgUrl = currentImage.url;
  const currentImgAlt =
    currentImage.altText ||
    `${productName} - Image ${activeIndex + 1} of ${safeImages.length}`;

  return (
    <>
      <div
        ref={containerRef}
        onKeyDown={handleGalleryKeyDown}
        tabIndex={0}
        aria-label="Product image gallery"
        className="flex flex-col-reverse md:flex-row gap-4 w-full outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-sky)] rounded-sm"
      >
        {/* ── Thumbnails Strip (Horizontal on Mobile, Vertical on Desktop) ── */}
        {safeImages.length > 1 && (
          <div
            role="tablist"
            aria-label="Product thumbnails"
            className="flex flex-row md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto no-scrollbar md:max-h-[520px] shrink-0 py-1"
          >
            {safeImages.map((img, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={img.url + idx}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => selectImage(idx)}
                  className={`group relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-sm border transition-all cursor-pointer ${
                    isSelected
                      ? "border-[var(--color-navy)] ring-2 ring-[var(--color-navy)]/35 shadow-xs scale-[1.02]"
                      : "border-[var(--color-sand)] hover:border-[var(--color-navy)]/50 opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`View photo ${idx + 1} of ${safeImages.length}`}
                >
                  <Image
                    src={img.url}
                    alt={img.altText || `${productName} thumbnail ${idx + 1}`}
                    fill
                    loading={idx === 0 ? "eager" : "lazy"}
                    className="object-cover"
                    sizes="(max-width: 768px) 64px, 80px"
                  />
                  {img.color && (
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] font-bold text-white text-center py-0.5 truncate px-1">
                      {img.color}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Main Image Viewport ── */}
        <div className="group relative flex-1">
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
              if (hasSwipedRef.current) {
                hasSwipedRef.current = false;
                return;
              }
              setLightboxZoomed(false);
              setShowLightbox(true);
            }}
            className={`relative aspect-square w-full select-none overflow-hidden rounded-sm bg-[var(--color-sand)] border border-[var(--color-sand)]/70 ${
              isTouchDevice
                ? "cursor-pointer"
                : isHovering
                ? "cursor-none"
                : "cursor-crosshair"
            }`}
            aria-label="Main product view. Click or tap to expand full screen."
          >
            {/* Base Image with aspect-ratio protection and next/image performance */}
            <Image
              key={currentImgUrl}
              src={currentImgUrl}
              alt={currentImgAlt}
              fill
              priority={activeIndex === 0}
              className="object-cover pointer-events-none transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            />

            {/* Magnifying Glass Loupe (Desktop cursor) */}
            {!isTouchDevice && (
              <div
                ref={loupeRef}
                className={`pointer-events-none absolute top-0 left-0 z-20 rounded-full border-[3px] border-white shadow-[0_14px_36px_rgba(0,0,0,0.38),0_0_0_1px_rgba(30,42,56,0.18)] overflow-hidden will-change-transform transition-opacity duration-150 ${
                  isHovering
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-95 pointer-events-none"
                }`}
                style={{
                  width: `${LENS_SIZE}px`,
                  height: `${LENS_SIZE}px`,
                  backgroundImage: `url(${currentImgUrl})`,
                  backgroundRepeat: "no-repeat",
                }}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/35 pointer-events-none" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-2 w-2 rounded-full border border-white/90 bg-black/20 shadow-xs" />
                </div>
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase backdrop-blur-xs shadow-xs">
                  {ZOOM_FACTOR}× Lens
                </div>
              </div>
            )}

            {/* Image Counter Badge (e.g. 2/6) */}
            {safeImages.length > 1 && (
              <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs shadow-xs">
                <span>
                  {activeIndex + 1}/{safeImages.length}
                </span>
                {currentImage.color && (
                  <span className="text-white/60">· {currentImage.color}</span>
                )}
              </div>
            )}

            {/* Floating Hint Pill */}
            <div
              className={`pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-md border border-[var(--color-sand)]/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-navy)]/80 shadow-2xs backdrop-blur-xs transition-all duration-200 ${
                isHovering && !isTouchDevice
                  ? "opacity-0 translate-y-1"
                  : "opacity-90"
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

          {/* Prev / Next Navigation Buttons on Main Image */}
          {safeImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                onMouseEnter={() => setIsHovering(false)}
                aria-label="Previous photo"
                className="cursor-pointer absolute left-2.5 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-white/85 hover:bg-white text-[var(--color-navy)] shadow-md transition-all opacity-80 md:opacity-0 group-hover:opacity-100 hover:scale-105"
              >
                <ChevronLeft className="h-4 w-4 pointer-events-none" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                onMouseEnter={() => setIsHovering(false)}
                aria-label="Next photo"
                className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-white/85 hover:bg-white text-[var(--color-navy)] shadow-md transition-all opacity-80 md:opacity-0 group-hover:opacity-100 hover:scale-105"
              >
                <ChevronRight className="h-4 w-4 pointer-events-none" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── High-Resolution Lightbox Modal (Accessible + Keyboard + Zoom) ── */}
      {showLightbox && (
        <div
          ref={lightboxModalRef}
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution product image inspection"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200 select-none outline-none"
        >
          {/* Top Bar Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 text-white">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                Photo {activeIndex + 1} of {safeImages.length}
              </span>
              {currentImage.color && (
                <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {currentImage.color}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom 1x / 2.5x Toggle */}
              <button
                type="button"
                onClick={() => setLightboxZoomed((z) => !z)}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors"
                aria-label={lightboxZoomed ? "Reset zoom" : "Zoom in 2.5x"}
              >
                {lightboxZoomed ? (
                  <>
                    <ZoomOut className="w-3.5 h-3.5 pointer-events-none" />
                    <span>Zoom Out (1x)</span>
                  </>
                ) : (
                  <>
                    <ZoomIn className="w-3.5 h-3.5 pointer-events-none" />
                    <span>Zoom In (2.5x)</span>
                  </>
                )}
              </button>

              {/* Close Button (Esc) */}
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                aria-label="Close lightbox (Esc)"
                className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-md bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <X className="w-4.5 h-4.5 pointer-events-none" />
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
                  handlePrev();
                }}
                className="cursor-pointer absolute left-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors border border-white/15 shadow-md"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5 pointer-events-none" />
              </button>
            )}

            {/* Next Image Arrow */}
            {safeImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="cursor-pointer absolute right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors border border-white/15 shadow-md"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5 pointer-events-none" />
              </button>
            )}

            {/* High-Res Image Display Container */}
            <div
              className={`relative max-w-4xl w-full aspect-square max-h-[78vh] overflow-hidden rounded-md transition-all ${
                lightboxZoomed ? "cursor-move" : "cursor-zoom-in"
              }`}
            >
              <div
                ref={lightboxImgRef}
                className="relative w-full h-full will-change-transform"
                style={{
                  transformOrigin: "50% 50%",
                  transform: lightboxZoomed ? "scale(2.5)" : "scale(1)",
                  transition: lightboxZoomed
                    ? "transform 0.08s ease-out"
                    : "transform 0.25s ease-out",
                }}
              >
                <Image
                  key={currentImgUrl}
                  src={currentImgUrl}
                  alt={currentImgAlt}
                  fill
                  className="object-contain pointer-events-none"
                  priority
                  quality={95}
                  sizes="100vw"
                />
              </div>
            </div>
          </div>

          {/* Bottom Thumbnails Strip */}
          {safeImages.length > 1 && (
            <div className="flex items-center justify-center gap-2.5 py-3 border-t border-white/10 bg-black/50 overflow-x-auto px-4 no-scrollbar">
              {safeImages.map((img, index) => {
                const isSelected = index === activeIndex;
                return (
                  <button
                    key={img.url + index}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xs border transition-all ${
                      isSelected
                        ? "border-white ring-2 ring-white/50 scale-105"
                        : "border-white/30 opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`View photo ${index + 1}`}
                  >
                    <Image
                      src={img.url}
                      alt={img.altText || `Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}