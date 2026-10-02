/**
 * Image Quality and Dimension Validation Utilities
 */

export interface ImageDimensionResult {
  valid: boolean;
  warn: boolean;
  error?: string;
  warning?: string;
}

export const MIN_IMAGE_DIMENSION = 300;
export const WARN_IMAGE_WIDTH = 800;

/**
 * Validates image dimensions against quality thresholds:
 * - Reject if width < 300 or height < 300 (too small for store)
 * - Warn (non-blocking) if width < 800 ("Only WxH, will look blurry on the product page")
 * - Pass with no warning if width >= 800 and height >= 300
 */
export function evaluateImageDimensions(width: number, height: number): ImageDimensionResult {
  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      valid: false,
      warn: false,
      error: `Image dimensions (${width}x${height}px) are too small. Width and height must each be at least ${MIN_IMAGE_DIMENSION}px.`,
    };
  }

  if (width < WARN_IMAGE_WIDTH) {
    return {
      valid: true,
      warn: true,
      warning: `Only ${width}x${height}, will look blurry on the product page`,
    };
  }

  return {
    valid: true,
    warn: false,
  };
}

/**
 * Reads an image file's natural dimensions in browser environments.
 */
export function getImageDimensionsFromFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve({ width: 0, height: 0 });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      URL.revokeObjectURL(objectUrl);
      resolve({ width: naturalWidth, height: naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load and measure image "${file.name}". The file may be corrupt.`));
    };

    img.src = objectUrl;
  });
}
