/**
 * Product Gallery Utilities
 * Filters and orders gallery images based on selected color,
 * falling back to shared or all images as required.
 */

export interface GalleryImageItem {
  id?: string;
  url: string;
  altText?: string | null;
  color?: string | null;
  isPrimary?: boolean;
  position?: number;
}

/**
 * Normalizes input to GalleryImageItem array.
 */
export function normalizeGalleryImages(
  images: (GalleryImageItem | string)[]
): GalleryImageItem[] {
  if (!images || !Array.isArray(images)) return [];

  return images.map((item, idx) => {
    if (typeof item === "string") {
      return {
        url: item,
        altText: null,
        color: null,
        isPrimary: idx === 0,
        position: idx,
      };
    }
    return {
      ...item,
      color: item.color?.trim() || null,
      isPrimary: Boolean(item.isPrimary),
      position: typeof item.position === "number" ? item.position : idx,
    };
  });
}

/**
 * Filters and orders images for the active color:
 * 1. Dedicated color images first (sorted by primary first, then position)
 * 2. Shared images (color is null or empty) second
 * 3. If a color has no dedicated images, falls back to all images!
 */
export function filterGalleryImages(
  images: (GalleryImageItem | string)[],
  selectedColor?: string | null
): GalleryImageItem[] {
  const normalized = normalizeGalleryImages(images);
  if (normalized.length === 0) return [];

  // If no color selected, return all images sorted by primary first, then position
  if (!selectedColor || !selectedColor.trim()) {
    return [...normalized].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.position ?? 0) - (b.position ?? 0);
    });
  }

  const targetColor = selectedColor.trim().toLowerCase();
  const colorMatches = normalized.filter(
    (img) => img.color && img.color.trim().toLowerCase() === targetColor
  );
  const sharedImages = normalized.filter(
    (img) => !img.color || img.color.trim() === ""
  );

  // If we found dedicated matches for this color:
  if (colorMatches.length > 0) {
    const sortedMatches = [...colorMatches].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.position ?? 0) - (b.position ?? 0);
    });

    const sortedShared = [...sharedImages].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return (a.position ?? 0) - (b.position ?? 0);
    });

    return [...sortedMatches, ...sortedShared];
  }

  // Fallback: If a color has none, fall back to all images
  return [...normalized].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.position ?? 0) - (b.position ?? 0);
  });
}

/**
 * Standard helper to get filtered gallery images for a color.
 */
export const getImagesForColor = filterGalleryImages;

/**
 * Returns the primary image URL for a given color, falling back to shared/product primary image.
 */
export function getPrimaryImageForColor(
  images: (GalleryImageItem | string)[],
  selectedColor?: string | null
): string | null {
  const filtered = filterGalleryImages(images, selectedColor);
  return filtered[0]?.url || null;
}

/**
 * Ensures that each color group (and the shared group) has exactly one primary image.
 */
export function normalizePrimaryPerColor<T extends { color?: string | null; isPrimary?: boolean }>(
  items: T[]
): T[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = item.color?.trim().toLowerCase() || "__shared__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ ...item });
  }

  const result: T[] = [];
  for (const [, group] of groups) {
    let primarySet = false;
    for (const img of group) {
      if (img.isPrimary && !primarySet) {
        primarySet = true;
      } else {
        img.isPrimary = false;
      }
    }
    if (!primarySet && group.length > 0) {
      group[0].isPrimary = true;
    }
    result.push(...group);
  }

  return result;
}
