import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DEFAULT_PRODUCT_IMAGE = "/images/Shoes/s05.avif";

/**
 * Returns a safe image URL for Next.js <Image /> component.
 * Defensively guards against empty strings, invalid inputs, or untracked local
 * /uploads/ directory paths in serverless/production deployments, falling back
 * to a bundled static placeholder image so Next.js optimization never throws
 * INVALID_IMAGE_OPTIMIZE_REQUEST.
 */
export function getSafeImageUrl(
  url?: string | null,
  fallback: string = DEFAULT_PRODUCT_IMAGE
): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  // Guard against untracked local /uploads/ paths on serverless / production Vercel
  if (trimmed.startsWith("/uploads/")) {
    if (
      process.env.NODE_ENV === "production" ||
      typeof window !== "undefined"
    ) {
      // If we are in production or client-side where /uploads/ files might be missing from origin,
      // fallback to the bundled placeholder asset.
      return fallback;
    }
  }

  return trimmed;
}
