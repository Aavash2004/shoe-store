import {
  COUNTRIES,
  isCountryEnabled,
  getEnabledCountries,
  getCountryByCode,
} from "../lib/constants/countries";
import { CURRENCIES, formatCurrency } from "../lib/constants/currencies";
import {
  checkoutSchema,
  checkoutAddressSchema,
  validatePhoneNumber,
  validatePostalCode,
} from "../lib/validations/checkout";
import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("=== VERIFYING PHASE 1: INTERNATIONAL FOUNDATION LAYER ===");

  // -------------------------------------------------------------
  // Test 1: Country Data & Allowlist Gating
  // -------------------------------------------------------------
  console.log("\n[Test 1] Country Data & Allowlist Gating...");
  const enabledCountries = getEnabledCountries();
  console.log("Enabled countries for checkout:", enabledCountries.map((c) => c.code));

  if (enabledCountries.length !== 1 || enabledCountries[0].code !== "NP") {
    throw new Error(`Test 1 FAILED: Expected only NP to be enabled, got: ${enabledCountries.map((c) => c.code)}`);
  }
  if (!COUNTRIES.US || !COUNTRIES.GB) {
    throw new Error("Test 1 FAILED: US and GB must exist in COUNTRIES dictionary!");
  }
  if (isCountryEnabled("US") !== false || isCountryEnabled("GB") !== false) {
    throw new Error("Test 1 FAILED: isCountryEnabled('US') and ('GB') must return false!");
  }
  if (isCountryEnabled("NP") !== true) {
    throw new Error("Test 1 FAILED: isCountryEnabled('NP') must return true!");
  }
  console.log("✓ Test 1 PASSED: Only NP is enabled; US and GB are present in data but disabled.");

  // -------------------------------------------------------------
  // Test 2: Nepali Phone Validation (No Regressions)
  // -------------------------------------------------------------
  console.log("\n[Test 2] Nepali Phone Validation...");
  const validNepaliNumbers = ["9841234567", "9851234567", "9741234567", "+9779841234567", "+977 9841234567"];
  const invalidNepaliNumbers = ["123456", "1234567890", "5551234567", "abcdefghij"];

  for (const num of validNepaliNumbers) {
    if (!validatePhoneNumber(num, "NP")) {
      throw new Error(`Test 2 FAILED: Expected valid Nepali number '${num}' to pass!`);
    }
  }
  for (const num of invalidNepaliNumbers) {
    if (validatePhoneNumber(num, "NP")) {
      throw new Error(`Test 2 FAILED: Expected invalid Nepali number '${num}' to fail!`);
    }
  }
  console.log("✓ Test 2 PASSED: Nepali phone validation matches expected behavior for standard mobile prefixes.");

  // -------------------------------------------------------------
  // Test 3: US & UK Phone Format Validation via libphonenumber-js
  // -------------------------------------------------------------
  console.log("\n[Test 3] US & UK Phone Validation (Future Proofing)...");
  const validUS = ["4155552671", "+14155552671", "(415) 555-2671"];
  const validUK = ["07911123456", "+447911123456"];

  for (const num of validUS) {
    if (!validatePhoneNumber(num, "US")) {
      throw new Error(`Test 3 FAILED: Expected valid US number '${num}' to pass!`);
    }
  }
  for (const num of validUK) {
    if (!validatePhoneNumber(num, "GB")) {
      throw new Error(`Test 3 FAILED: Expected valid UK number '${num}' to pass!`);
    }
  }
  console.log("✓ Test 3 PASSED: libphonenumber-js correctly validates sample US and UK phone numbers.");

  // -------------------------------------------------------------
  // Test 4: Server-Side Gating Rejection (Direct Schema Enforcement)
  // -------------------------------------------------------------
  console.log("\n[Test 4] Server-Side Country Allowlist Gating...");
  const sampleVariant = await prisma.productVariant.findFirst({
    where: { isActive: true, stock: { gt: 0 } },
  });
  if (!sampleVariant) {
    throw new Error("No active variant found in DB for checkout test");
  }

  // Attempt checkout with US (bypassing frontend UI)
  const usPayload = {
    fullName: "John Smith",
    country: "US",
    phone: "+14155552671",
    line1: "123 Market St",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    paymentMethod: "STRIPE",
    items: [{ variantId: sampleVariant.id, quantity: 1 }],
  };

  const usResult = checkoutSchema.safeParse(usPayload);
  if (usResult.success) {
    throw new Error("Test 4 FAILED: Server-side validation allowed disabled country 'US'!");
  }
  const usError = usResult.error.flatten().fieldErrors.country?.[0];
  console.log("US rejection message:", usError);
  if (!usError || !usError.includes("Shipping is not currently available")) {
    throw new Error(`Test 4 FAILED: Expected country rejection message, got: ${usError}`);
  }

  // Attempt checkout with GB
  const gbPayload = { ...usPayload, country: "GB", phone: "+447911123456", postalCode: "SW1A 1AA" };
  const gbResult = checkoutSchema.safeParse(gbPayload);
  if (gbResult.success) {
    throw new Error("Test 4 FAILED: Server-side validation allowed disabled country 'GB'!");
  }

  // Attempt checkout with invalid payment method for NP (e.g. STRIPE in NP)
  const npInvalidPayment = {
    fullName: "Ram Bahadur",
    country: "NP",
    phone: "9841234567",
    line1: "New Road",
    city: "Kathmandu",
    state: "Bagmati",
    postalCode: "44600",
    paymentMethod: "STRIPE",
    items: [{ variantId: sampleVariant.id, quantity: 1 }],
  };
  const npPaymentResult = checkoutSchema.safeParse(npInvalidPayment);
  if (npPaymentResult.success) {
    throw new Error("Test 4 FAILED: Expected paymentMethod 'STRIPE' to be rejected for Nepal!");
  }
  console.log("NP invalid payment rejection:", npPaymentResult.error.flatten().fieldErrors.paymentMethod?.[0]);
  console.log("✓ Test 4 PASSED: Server-side validation strictly enforces country allowlist and payment methods.");

  // -------------------------------------------------------------
  // Test 5: Full Nepal Checkout Flow (Existing Behavior Unbroken)
  // -------------------------------------------------------------
  console.log("\n[Test 5] Full Nepal Checkout Flow Validation...");
  const validNpPayload = {
    fullName: "Aavash Shrestha",
    country: "NP",
    phone: "9841234567",
    line1: "Jhamsikhel Road",
    city: "Lalitpur",
    state: "Bagmati",
    postalCode: "44700",
    paymentMethod: "COD",
    guestEmail: "test.nepal@example.com",
    items: [{ variantId: sampleVariant.id, quantity: 1 }],
  };

  const npResult = checkoutSchema.safeParse(validNpPayload);
  if (!npResult.success) {
    throw new Error(`Test 5 FAILED: Valid Nepal checkout payload failed validation: ${JSON.stringify(npResult.error.flatten())}`);
  }
  console.log("✓ Test 5 PASSED: Valid Nepal order payload successfully validated by checkoutSchema.");

  // -------------------------------------------------------------
  // Test 6: Currency Formatter Check
  // -------------------------------------------------------------
  console.log("\n[Test 6] Currency Formatting Utility Check...");
  const formattedUSD = formatCurrency(129.99, "USD");
  const formattedGBP = formatCurrency(105.5, "GBP");
  const formattedNPR = formatCurrency(5000, "NPR");

  console.log("USD Formatted:", formattedUSD);
  console.log("GBP Formatted:", formattedGBP);
  console.log("NPR Formatted:", formattedNPR);

  if (!formattedUSD.includes("$") && !formattedUSD.includes("USD")) {
    throw new Error("USD formatting failed");
  }
  if (!formattedGBP.includes("£") && !formattedGBP.includes("GBP")) {
    throw new Error("GBP formatting failed");
  }
  console.log("✓ Test 6 PASSED: formatCurrency outputs localized currency strings using Intl.NumberFormat.");

  console.log("\n=== ALL 6 PHASE 1 VERIFICATION GATES PASSED! ===");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(() => process.exit());
