import { isValidImageSignature, isSvgFile } from "../app/api/upload/route";
import { isAdminSession } from "../lib/auth/authorization";
import {
  generateVariantMatrix,
  resolveAutoSkuSuffix,
} from "../lib/utils/variant-generator";

async function runProductFlowTests() {
  console.log("=== Running Add New Product Flow Tests ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Non-admin request rejected
  const customerSession = {
    user: {
      role: "CUSTOMER",
      email: "shopper@example.com",
    },
  };
  assert(isAdminSession(customerSession) === false, "Non-admin customer request is rejected");

  const nullSession = null;
  assert(isAdminSession(nullSession) === false, "Unauthenticated guest request is rejected");

  const adminSession = {
    user: {
      role: "ADMIN",
      email: "admin@shoestore.com",
    },
  };
  assert(isAdminSession(adminSession) === true, "Admin session is authorized");

  // 2. Duplicate SKU detection & Normalization
  function detectDuplicateSkus(variants: { sku: string }[]): { hasDuplicate: boolean; duplicate?: string } {
    const normalizedSkus = variants.map((v) => v.sku.trim().toUpperCase());
    const seen = new Set<string>();
    for (const sku of normalizedSkus) {
      if (seen.has(sku)) {
        return { hasDuplicate: true, duplicate: sku };
      }
      seen.add(sku);
    }
    return { hasDuplicate: false };
  }

  const variantListDuplicate = [
    { sku: "nike-air-01" },
    { sku: "NIKE-AIR-01" }, // Duplicate with different casing
  ];
  const dupCheck1 = detectDuplicateSkus(variantListDuplicate);
  assert(
    dupCheck1.hasDuplicate === true && dupCheck1.duplicate === "NIKE-AIR-01",
    "Duplicate SKU detected when casing differs (normalized to uppercase)"
  );

  const variantListUnique = [
    { sku: "NIKE-AIR-01" },
    { sku: "NIKE-AIR-02" },
    { sku: "NIKE-AIR-03" },
  ];
  const dupCheck2 = detectDuplicateSkus(variantListUnique);
  assert(dupCheck2.hasDuplicate === false, "Unique SKUs are accepted");

  // 3. Duplicate Slug detection
  function detectDuplicateSlug(newSlug: string, existingSlugs: string[]): boolean {
    const normalized = newSlug.trim().toLowerCase();
    return existingSlugs.map((s) => s.toLowerCase()).includes(normalized);
  }

  const existingDbSlugs = ["air-jordan-1", "dunk-low-retro", "yeezy-boost-350"];
  assert(
    detectDuplicateSlug("air-jordan-1", existingDbSlugs) === true,
    "Duplicate slug is detected and rejected"
  );
  assert(
    detectDuplicateSlug("AIR-JORDAN-1", existingDbSlugs) === true,
    "Duplicate slug with uppercase is detected and rejected"
  );
  assert(
    detectDuplicateSlug("air-jordan-4-retro", existingDbSlugs) === false,
    "Unique new slug is accepted"
  );

  // 4. File Magic Bytes & SVG Rejection
  // Valid JPEG: FF D8 FF E0
  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpegSig = isValidImageSignature(validJpegBuffer);
  assert(jpegSig.isValid === true && jpegSig.format === "jpeg", "Valid JPEG magic bytes accepted");

  // Valid PNG: 89 50 4E 47 0D 0A 1A 0A
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const pngSig = isValidImageSignature(validPngBuffer);
  assert(pngSig.isValid === true && pngSig.format === "png", "Valid PNG magic bytes accepted");

  // Valid WebP: 'RIFF' + 4 bytes + 'WEBP'
  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // length
    0x57, 0x45, 0x42, 0x50, // WEBP
  ]);
  const webpSig = isValidImageSignature(validWebpBuffer);
  assert(webpSig.isValid === true && webpSig.format === "webp", "Valid WebP magic bytes accepted");

  // Spoofed executable or text file pretending to be jpg
  const spoofedExeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00", "utf8");
  const exeSig = isValidImageSignature(spoofedExeBuffer);
  assert(exeSig.isValid === false, "Fake image with invalid magic bytes is rejected");

  // SVG file detection
  const svgText = "<svg xmlns='http://www.w3.org/2000/svg'><circle r='10'/></svg>";
  const svgBuffer = Buffer.from(svgText, "utf8");
  const mockSvgFile = {
    name: "icon.svg",
    type: "image/svg+xml",
  } as File;
  assert(isSvgFile(mockSvgFile, svgBuffer) === true, "SVG file extension and content detected and rejected");

  const mockSpoofedSvgFile = {
    name: "icon.png", // spoofed name
    type: "image/png", // spoofed mime
  } as File;
  assert(isSvgFile(mockSpoofedSvgFile, svgBuffer) === true, "Spoofed SVG with png name is detected and rejected");

  // 5. Variant Generator: Matrix Generation (3 colors x 4 sizes = 12)
  const testColors = ["Red", "Blue", "Black"];
  const testSizes = ["40", "41", "42", "43"];
  const matrix12 = generateVariantMatrix({
    colors: testColors,
    sizes: testSizes,
    productName: "Air Jordan 1",
    basePrice: "180",
  });
  assert(
    matrix12.length === 12,
    `Matrix generation: 3 colors x 4 sizes generates exactly 12 variants (got ${matrix12.length})`
  );
  assert(
    matrix12.every((v) => v.sku.startsWith("AJ1-") && v.price === "180" && v.stock === "0"),
    "Matrix generation sets default prefix, basePrice, and 0 stock for all variants"
  );

  // 6. Preserving stock and price on regenerate
  const initialVariants = generateVariantMatrix({
    colors: ["Red", "Black"],
    sizes: ["41", "42"],
    productName: "Air Jordan 1",
    basePrice: "150",
  });
  // Simulate admin modifying price & stock on Red / 41
  const modifiedVariants = initialVariants.map((v) => {
    if (v.color === "Red" && v.size === "41") {
      return { ...v, price: "199", stock: "15" };
    }
    return v;
  });
  // Admin adds "White" and regenerates
  const regeneratedMatrix = generateVariantMatrix({
    colors: ["Red", "Black", "White"],
    sizes: ["41", "42"],
    existingVariants: modifiedVariants,
    productName: "Air Jordan 1",
    basePrice: "150",
  });
  assert(
    regeneratedMatrix.length === 6,
    `Regenerating with added color produces 6 variants (got ${regeneratedMatrix.length})`
  );
  const preservedRed41 = regeneratedMatrix.find((v) => v.color === "Red" && v.size === "41");
  assert(
    preservedRed41?.price === "199" && preservedRed41?.stock === "15",
    "Regenerating preserves previously entered price and stock for existing combinations"
  );
  const newWhite41 = regeneratedMatrix.find((v) => v.color === "White" && v.size === "41");
  assert(
    newWhite41?.price === "150" && newWhite41?.stock === "0",
    "Newly added combinations receive base price and default 0 stock"
  );

  // 7. Duplicate color + size pair rejection
  function validateUniqueColorSizePairs(variants: { color: string; size: string }[]): boolean {
    const pairSet = new Set<string>();
    for (const v of variants) {
      const key = `${v.color.trim().toLowerCase()}:::${v.size.trim().toLowerCase()}`;
      if (pairSet.has(key)) return false;
      pairSet.add(key);
    }
    return true;
  }
  const duplicateColorSizeList = [
    { color: "Black", size: "42" },
    { color: "black", size: "42" }, // Duplicate with different casing
  ];
  assert(
    validateUniqueColorSizePairs(duplicateColorSizeList) === false,
    "Duplicate color + size pair is rejected"
  );
  const validColorSizeList = [
    { color: "Black", size: "42" },
    { color: "Black", size: "43" },
    { color: "White", size: "42" },
  ];
  assert(
    validateUniqueColorSizePairs(validColorSizeList) === true,
    "Unique color + size pairs are accepted"
  );

  // 8. Auto SKU collision suffixing (-2, -3, etc.)
  const takenSkus = new Set(["AJ1-BLK-42", "AJ1-BLK-42-2"]);
  const suffixedSku = resolveAutoSkuSuffix("AJ1-BLK-42", (cand) => takenSkus.has(cand));
  assert(
    suffixedSku === "AJ1-BLK-42-3",
    `Auto SKU collision resolution suffixes colliding SKU to -3 (got "${suffixedSku}")`
  );
  const nonCollidingSku = resolveAutoSkuSuffix("AJ1-BLK-43", (cand) => takenSkus.has(cand));
  assert(
    nonCollidingSku === "AJ1-BLK-43",
    `Auto SKU collision resolution leaves non-colliding SKU unchanged (got "${nonCollidingSku}")`
  );

  // 9. Existing SKUs untouched on edit
  const existingDbVariants = [
    {
      id: "var-existing-123",
      color: "Black",
      size: "42",
      sku: "ORIGINAL-LEGACY-SKU-99",
      price: "220",
      stock: "7",
    },
  ];
  // Admin renames product to "Super Runner Pro" and adds "White"
  const editMatrix = generateVariantMatrix({
    colors: ["Black", "White"],
    sizes: ["42"],
    existingVariants: existingDbVariants,
    productName: "Super Runner Pro",
    basePrice: "130",
  });
  const existingUntouched = editMatrix.find((v) => v.id === "var-existing-123");
  assert(
    existingUntouched?.sku === "ORIGINAL-LEGACY-SKU-99",
    `Existing variant SKU is preserved and untouched on edit (got "${existingUntouched?.sku}")`
  );
  assert(
    existingUntouched?.price === "220" && existingUntouched?.stock === "7",
    "Existing variant price and stock remain untouched on edit"
  );
  const newEditVariant = editMatrix.find((v) => v.color === "White" && v.size === "42");
  assert(
    newEditVariant?.sku === "SRP-WHT-42",
    `New variant added on edit generates SKU with new product prefix (got "${newEditVariant?.sku}")`
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runProductFlowTests();

