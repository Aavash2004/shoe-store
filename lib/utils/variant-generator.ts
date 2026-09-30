/**
 * Variant Generator & SKU Helper Utilities
 */

const COMMON_COLOR_CODES: Record<string, string> = {
  black: "BLK",
  white: "WHT",
  red: "RED",
  blue: "BLU",
  green: "GRN",
  yellow: "YLW",
  grey: "GRY",
  gray: "GRY",
  brown: "BRN",
  orange: "ORG",
  pink: "PNK",
  purple: "PRP",
  navy: "NVY",
  beige: "BGE",
  silver: "SLV",
  gold: "GLD",
  tan: "TAN",
  teal: "TEA",
  olive: "OLV",
  maroon: "MRN",
  burgundy: "BGY",
  cream: "CRM",
  khaki: "KHK",
  cyan: "CYN",
  charcoal: "CHR",
};

/**
 * Extracts a 2-6 character uppercase alphanumeric prefix from a product name.
 * Example: "Air Jordan 1 High" -> "AJ1H", "Ultra Boost" -> "UB", "Runner" -> "RUN"
 */
export function generateProductPrefix(productName: string): string {
  if (!productName || !productName.trim()) {
    return "SHOE";
  }

  const cleanWords = productName
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);

  if (cleanWords.length > 1) {
    const initials = cleanWords.map((w) => w[0]).join("").toUpperCase();
    if (initials.length >= 2) {
      return initials.slice(0, 6);
    }
  }

  const single = cleanWords.join("").toUpperCase();
  if (single.length >= 3) {
    return single.slice(0, 5);
  }

  return (single + "SHOE").slice(0, 4);
}

/**
 * Derives a 3-letter uppercase color code.
 * Example: "Black" -> "BLK", "Crimson" -> "CRM"
 */
export function getColorCode(colorName: string): string {
  if (!colorName || !colorName.trim()) {
    return "GEN";
  }

  const normalized = colorName.trim().toLowerCase();
  if (COMMON_COLOR_CODES[normalized]) {
    return COMMON_COLOR_CODES[normalized];
  }

  const clean = normalized.replace(/[^a-z0-9]/g, "").toUpperCase();
  if (clean.length <= 3) {
    return clean.padEnd(3, "X");
  }

  // Extract consonants if possible
  const consonants = clean.replace(/[AEIOU]/g, "");
  if (consonants.length >= 3) {
    return consonants.slice(0, 3);
  }

  return clean.slice(0, 3);
}

/**
 * Generates an auto SKU string in format PREFIX-COLORCODE-SIZE.
 * Example: AJ1-BLK-42
 */
export function generateBaseSku(productName: string, color: string, size: string): string {
  const prefix = generateProductPrefix(productName);
  const colorCode = getColorCode(color);
  const sizeClean = size.trim().replace(/[^A-Za-z0-9.]/g, "").toUpperCase();
  return `${prefix}-${colorCode}-${sizeClean}`;
}

/**
 * Parses a size range like "38-45" or "38 - 42" into an array of string sizes.
 */
export function parseSizeRange(input: string): string[] {
  const match = input.trim().match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/);
  if (!match) return [];

  const start = parseFloat(match[1]);
  const end = parseFloat(match[2]);

  if (isNaN(start) || isNaN(end) || start > end || end - start > 30) {
    return [];
  }

  const result: string[] = [];
  const step = Number.isInteger(start) && Number.isInteger(end) ? 1 : 0.5;

  for (let s = start; s <= end + 0.001; s += step) {
    result.push(Number.isInteger(s) ? String(s) : s.toFixed(1));
  }

  return result;
}

export interface GeneratorVariant {
  id?: string;
  size: string;
  color: string;
  sku: string;
  price: string;
  stock: string;
  isManualSku?: boolean;
}

/**
 * Creates or updates the color × size matrix while preserving existing variant
 * properties (price, stock, id, manual SKU) for combinations that still exist.
 */
export function generateVariantMatrix({
  colors,
  sizes,
  existingVariants = [],
  basePrice = "0",
  productName = "",
}: {
  colors: string[];
  sizes: string[];
  existingVariants?: GeneratorVariant[];
  basePrice?: string;
  productName?: string;
}): GeneratorVariant[] {
  const cleanColors = Array.from(new Set(colors.map((c) => c.trim()).filter(Boolean)));
  const cleanSizes = Array.from(new Set(sizes.map((s) => s.trim()).filter(Boolean)));

  const existingMap = new Map<string, GeneratorVariant>();
  for (const v of existingVariants) {
    const key = `${v.color.trim().toLowerCase()}:::${v.size.trim().toLowerCase()}`;
    existingMap.set(key, v);
  }

  const result: GeneratorVariant[] = [];
  const usedSkusInForm = new Set<string>();

  // Pre-seed already used existing SKUs
  for (const v of existingVariants) {
    if (v.sku) {
      usedSkusInForm.add(v.sku.trim().toUpperCase());
    }
  }

  for (const color of cleanColors) {
    for (const size of cleanSizes) {
      const key = `${color.toLowerCase()}:::${size.toLowerCase()}`;
      const existing = existingMap.get(key);

      if (existing) {
        // PRESERVE existing variant completely (including existing SKU and ID)
        result.push({
          ...existing,
          color, // normalized casing
          size,
        });
      } else {
        // Brand new combination: generate unique auto SKU
        let candidateSku = generateBaseSku(productName, color, size);
        let counter = 2;
        const originalBase = candidateSku;

        while (usedSkusInForm.has(candidateSku)) {
          candidateSku = `${originalBase}-${counter}`;
          counter++;
        }
        usedSkusInForm.add(candidateSku);

        result.push({
          color,
          size,
          sku: candidateSku,
          price: basePrice && parseFloat(basePrice) > 0 ? basePrice : "0",
          stock: "0",
          isManualSku: false,
        });
      }
    }
  }

  return result;
}

/**
 * Resolves collision for an auto-generated SKU by appending -2, -3, etc. (synchronous)
 */
export function resolveAutoSkuSuffix(
  sku: string,
  isTaken: (candidate: string) => boolean
): string {
  const currentSku = sku.trim().toUpperCase();
  if (!isTaken(currentSku)) return currentSku;

  const parts = currentSku.split("-");
  let base: string;
  let counter = 2;

  if (parts.length > 3 && /^\d+$/.test(parts[parts.length - 1])) {
    base = parts.slice(0, -1).join("-");
    counter = parseInt(parts[parts.length - 1], 10) + 1;
  } else {
    base = currentSku;
    counter = 2;
  }

  while (true) {
    const candidate = `${base}-${counter}`;
    if (!isTaken(candidate)) {
      return candidate;
    }
    counter++;
  }
}

/**
 * Resolves collision for an auto-generated SKU with async checker (e.g. database lookups)
 */
export async function resolveAutoSkuCollisionAsync(
  sku: string,
  isTaken: (candidate: string) => boolean | Promise<boolean>
): Promise<string> {
  const currentSku = sku.trim().toUpperCase();
  if (!(await isTaken(currentSku))) return currentSku;

  const parts = currentSku.split("-");
  let base: string;
  let counter = 2;

  if (parts.length > 3 && /^\d+$/.test(parts[parts.length - 1])) {
    base = parts.slice(0, -1).join("-");
    counter = parseInt(parts[parts.length - 1], 10) + 1;
  } else {
    base = currentSku;
    counter = 2;
  }

  while (true) {
    const candidate = `${base}-${counter}`;
    if (!(await isTaken(candidate))) {
      return candidate;
    }
    counter++;
  }
}
