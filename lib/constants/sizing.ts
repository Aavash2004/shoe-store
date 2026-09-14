export type SizeSystem = "US_MEN" | "US_WOMEN" | "UK" | "EU" | "CM";

export interface SizeConversion {
  eu: string;
  usMen: string;
  usWomen: string;
  uk: string;
  cm: string;
}

export interface DualDisplaySize {
  primary: string;
  secondary: string;
  isApproximate: boolean;
  conversions: SizeConversion;
}

/**
 * Standard international footwear sizing conversion matrix
 * Covering adult sizing from EU 36 to EU 48.
 */
export const SIZING_MATRIX: SizeConversion[] = [
  { eu: "36", usMen: "4", usWomen: "5.5", uk: "3.5", cm: "22.5" },
  { eu: "36.5", usMen: "4.5", usWomen: "6", uk: "4", cm: "23.0" },
  { eu: "37.5", usMen: "5", usWomen: "6.5", uk: "4.5", cm: "23.5" },
  { eu: "38", usMen: "5.5", usWomen: "7", uk: "5", cm: "24.0" },
  { eu: "38.5", usMen: "6", usWomen: "7.5", uk: "5.5", cm: "24.0" },
  { eu: "39", usMen: "6.5", usWomen: "8", uk: "6", cm: "24.5" },
  { eu: "40", usMen: "7", usWomen: "8.5", uk: "6", cm: "25.0" },
  { eu: "40.5", usMen: "7.5", usWomen: "9", uk: "6.5", cm: "25.5" },
  { eu: "41", usMen: "8", usWomen: "9.5", uk: "7", cm: "26.0" },
  { eu: "42", usMen: "8.5", usWomen: "10", uk: "7.5", cm: "26.5" },
  { eu: "42.5", usMen: "9", usWomen: "10.5", uk: "8", cm: "27.0" },
  { eu: "43", usMen: "9.5", usWomen: "11", uk: "8.5", cm: "27.5" },
  { eu: "44", usMen: "10", usWomen: "11.5", uk: "9", cm: "28.0" },
  { eu: "44.5", usMen: "10.5", usWomen: "12", uk: "9.5", cm: "28.5" },
  { eu: "45", usMen: "11", usWomen: "12.5", uk: "10", cm: "29.0" },
  { eu: "45.5", usMen: "11.5", usWomen: "13", uk: "10.5", cm: "29.5" },
  { eu: "46", usMen: "12", usWomen: "13.5", uk: "11", cm: "30.0" },
  { eu: "47", usMen: "12.5", usWomen: "14", uk: "11.5", cm: "30.5" },
  { eu: "47.5", usMen: "13", usWomen: "14.5", uk: "12", cm: "31.0" },
  { eu: "48", usMen: "13.5", usWomen: "15", uk: "12.5", cm: "31.5" },
];

/**
 * Converts a raw size string into equivalent sizes across all systems
 * using a robust nearest-neighbor fallback that never throws or returns null.
 */
export function getConvertedSize(
  rawSize: string,
  gender: string = "UNISEX"
): { conversions: SizeConversion; isApproximate: boolean } {
  if (!rawSize || typeof rawSize !== "string") {
    return {
      conversions: SIZING_MATRIX[9], // Defaults safely to EU 42
      isApproximate: true,
    };
  }

  const cleanRaw = rawSize.trim();

  // 1. Direct EU match
  const exactMatch = SIZING_MATRIX.find(
    (row) => row.eu === cleanRaw || row.eu === cleanRaw.replace(",", ".")
  );
  if (exactMatch) {
    return { conversions: exactMatch, isApproximate: false };
  }

  // 2. Numeric nearest-neighbor matching on EU
  const numericVal = parseFloat(cleanRaw.replace(/[^0-9.]/g, ""));
  if (!isNaN(numericVal)) {
    // If value looks like standard EU (35 - 50)
    if (numericVal >= 34 && numericVal <= 52) {
      let closest = SIZING_MATRIX[0];
      let minDiff = Math.abs(parseFloat(closest.eu) - numericVal);

      for (const row of SIZING_MATRIX) {
        const diff = Math.abs(parseFloat(row.eu) - numericVal);
        if (diff < minDiff) {
          minDiff = diff;
          closest = row;
        }
      }

      return {
        conversions: closest,
        isApproximate: minDiff > 0.05,
      };
    }

    // If value looks like US/UK size (3 to 16)
    if (numericVal >= 3 && numericVal <= 16) {
      const isWomen = gender.toUpperCase().includes("WOMEN");
      let closest = SIZING_MATRIX[0];
      let minDiff = 999;

      for (const row of SIZING_MATRIX) {
        const targetVal = parseFloat(isWomen ? row.usWomen : row.usMen);
        const diff = Math.abs(targetVal - numericVal);
        if (diff < minDiff) {
          minDiff = diff;
          closest = row;
        }
      }

      return {
        conversions: closest,
        isApproximate: minDiff > 0.1,
      };
    }
  }

  // Safe fallback to median EU 42
  return {
    conversions: SIZING_MATRIX[9],
    isApproximate: true,
  };
}

/**
 * Returns primary and secondary dual-display text for a size button pill.
 * E.g. When primary is US:
 *   primary: "US 8.5"
 *   secondary: "UK 7.5 · EU 42"
 */
export function getDualDisplaySize(
  rawSize: string,
  primarySystem: SizeSystem = "US_MEN",
  gender: string = "UNISEX"
): DualDisplaySize {
  const { conversions, isApproximate } = getConvertedSize(rawSize, gender);

  const isWomen = gender.toUpperCase().includes("WOMEN");
  const usSize = isWomen ? conversions.usWomen : conversions.usMen;

  let primary = "";
  let secondary = "";

  switch (primarySystem) {
    case "US_MEN":
    case "US_WOMEN":
      primary = `US ${usSize}`;
      secondary = `UK ${conversions.uk} · EU ${conversions.eu}`;
      break;

    case "UK":
      primary = `UK ${conversions.uk}`;
      secondary = `US ${usSize} · EU ${conversions.eu}`;
      break;

    case "EU":
      primary = `EU ${conversions.eu}`;
      secondary = `US ${usSize} · UK ${conversions.uk}`;
      break;

    case "CM":
      primary = `${conversions.cm} cm`;
      secondary = `US ${usSize} · UK ${conversions.uk}`;
      break;

    default:
      primary = `US ${usSize}`;
      secondary = `UK ${conversions.uk} · EU ${conversions.eu}`;
      break;
  }

  return {
    primary,
    secondary,
    isApproximate,
    conversions,
  };
}
