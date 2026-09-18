export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  dialCode: string;
  currency: string;
  postalCodeRegex: RegExp;
  postalCodePlaceholder: string;
  allowedPaymentMethods: string[];
  isCheckoutEnabled: boolean;
}

export const COUNTRIES: Record<string, Country> = {
  NP: {
    code: "NP",
    name: "Nepal",
    flag: "🇳🇵",
    dialCode: "+977",
    currency: "NPR",
    postalCodeRegex: /^(?:\d{5})?$/, // Nepal 5-digit postal code (optional in many rural areas)
    postalCodePlaceholder: "e.g. 44600 (optional)",
    allowedPaymentMethods: ["COD", "KHALTI"],
    isCheckoutEnabled: true,
  },
  US: {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    dialCode: "+1",
    currency: "USD",
    postalCodeRegex: /^\d{5}(?:-\d{4})?$/, // 5-digit ZIP or ZIP+4
    postalCodePlaceholder: "e.g. 90210 or 90210-1234",
    allowedPaymentMethods: ["STRIPE"],
    isCheckoutEnabled: true,
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    flag: "🇬🇧",
    dialCode: "+44",
    currency: "GBP",
    postalCodeRegex: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, // Standard UK outward + inward postcode
    postalCodePlaceholder: "e.g. SW1A 1AA",
    allowedPaymentMethods: ["STRIPE"],
    isCheckoutEnabled: true,
  },
};

/**
 * Single source of truth helper to check if checkout is enabled for a given country code.
 * All components and API routes MUST call through this function rather than inspecting
 * the country object directly.
 */
export function isCountryEnabled(countryCode: string): boolean {
  if (!countryCode) return false;
  const country = COUNTRIES[countryCode.toUpperCase()];
  return !!country?.isCheckoutEnabled;
}

export function getCountryByCode(countryCode: string): Country | undefined {
  if (!countryCode) return undefined;
  return COUNTRIES[countryCode.toUpperCase()];
}

export function getEnabledCountries(): Country[] {
  return Object.values(COUNTRIES).filter((country) => country.isCheckoutEnabled);
}

export function getAllCountries(): Country[] {
  return Object.values(COUNTRIES);
}
