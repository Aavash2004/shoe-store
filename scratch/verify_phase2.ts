import {
  SIZING_MATRIX,
  getConvertedSize,
  getDualDisplaySize,
} from "../lib/constants/sizing";

function main() {
  console.log("=== VERIFYING PHASE 2: FOOTWEAR SIZING & FIT GUIDE ===");

  // Test 1: Sizing Matrix completeness
  console.log("\n[Test 1] Sizing Matrix Integrity...");
  if (SIZING_MATRIX.length < 15) {
    throw new Error("Sizing matrix must have at least 15 standard sizes!");
  }
  const sample42 = SIZING_MATRIX.find((s) => s.eu === "42");
  if (!sample42 || sample42.usMen !== "8.5" || sample42.uk !== "7.5" || sample42.cm !== "26.5") {
    throw new Error(`EU 42 conversions mismatch: ${JSON.stringify(sample42)}`);
  }
  console.log("✓ Test 1 PASSED: Sizing matrix has valid mappings across EU, US, UK, and CM.");

  // Test 2: Dual Display Size Generation (US, UK, EU, CM)
  console.log("\n[Test 2] Dual-Display Labels for Size Pills...");
  const usDual = getDualDisplaySize("42", "US_MEN");
  console.log("Primary US:", usDual.primary, "| Secondary:", usDual.secondary);
  if (usDual.primary !== "US 8.5" || !usDual.secondary.includes("UK 7.5") || !usDual.secondary.includes("EU 42")) {
    throw new Error("Dual display for US_MEN failed");
  }

  const ukDual = getDualDisplaySize("42", "UK");
  console.log("Primary UK:", ukDual.primary, "| Secondary:", ukDual.secondary);
  if (ukDual.primary !== "UK 7.5" || !ukDual.secondary.includes("US 8.5") || !ukDual.secondary.includes("EU 42")) {
    throw new Error("Dual display for UK failed");
  }

  const euDual = getDualDisplaySize("42", "EU");
  console.log("Primary EU:", euDual.primary, "| Secondary:", euDual.secondary);
  if (euDual.primary !== "EU 42" || !euDual.secondary.includes("US 8.5") || !euDual.secondary.includes("UK 7.5")) {
    throw new Error("Dual display for EU failed");
  }

  const cmDual = getDualDisplaySize("42", "CM");
  console.log("Primary CM:", cmDual.primary, "| Secondary:", cmDual.secondary);
  if (cmDual.primary !== "26.5 cm") {
    throw new Error("Dual display for CM failed");
  }
  console.log("✓ Test 2 PASSED: getDualDisplaySize produces simultaneous primary + secondary labels for all systems.");

  // Test 3: Fallback & Non-throwing Nearest-Neighbor Protection
  console.log("\n[Test 3] Edge Case & Non-Throwing Nearest-Neighbor Fallback...");
  const edgeCases = [
    { input: "42.2", expectedApprox: true },
    { input: "39.8", expectedApprox: true },
    { input: "40", expectedApprox: false },
    { input: "invalid_text", expectedApprox: true },
    { input: "", expectedApprox: true },
  ];

  for (const tc of edgeCases) {
    const res = getConvertedSize(tc.input);
    if (!res || !res.conversions || typeof res.conversions.eu !== "string") {
      throw new Error(`Conversion returned invalid result for '${tc.input}'`);
    }
    console.log(`Input: '${tc.input}' -> EU ${res.conversions.eu}, US ${res.conversions.usMen}, Approx: ${res.isApproximate}`);
  }
  console.log("✓ Test 3 PASSED: Nearest-neighbor fallback safely resolves unknown, decimal, or invalid size inputs.");

  console.log("\n=== ALL PHASE 2 VERIFICATION GATES PASSED! ===");
}

main();
