import { z } from "zod";
import { isValidPhoneNumber, CountryCode } from "libphonenumber-js";
import {
  isCountryEnabled,
  getCountryByCode,
} from "@/lib/constants/countries";

/**
 * Shared phone number validator using libphonenumber-js against the selected country.
 */
export function validatePhoneNumber(phone: string, countryCode: string): boolean {
  if (!phone || !countryCode) return false;
  try {
    const cleanPhone = phone.trim().replace(/[\s-]/g, "");
    return isValidPhoneNumber(cleanPhone, countryCode.toUpperCase() as CountryCode);
  } catch {
    return false;
  }
}

/**
 * Shared postal code validator against the country's defined regex pattern.
 */
export function validatePostalCode(postalCode: string, countryCode: string): boolean {
  if (!countryCode) return false;
  const country = getCountryByCode(countryCode);
  if (!country) return false;
  const cleanCode = (postalCode || "").trim();
  return country.postalCodeRegex.test(cleanCode);
}

/**
 * Base address and contact validation schema used for the checkout form.
 */
export const checkoutAddressSchema = z
  .object({
    guestEmail: z
      .string()
      .trim()
      .email("Please enter a valid email address.")
      .optional()
      .or(z.literal("")),

    guestName: z
      .string()
      .trim()
      .max(100, "Name must be less than 100 characters.")
      .optional()
      .or(z.literal("")),

    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(100, "Full name must be less than 100 characters.")
      .regex(
        /^[\p{L}\p{M}]+(?:[\s'-][\p{L}\p{M}]+)*$/u,
        "Please enter a valid full name."
      ),

    country: z
      .string()
      .trim()
      .min(2, "Please select a country.")
      .refine(
        (code) => isCountryEnabled(code),
        {
          message: "Shipping is not currently available for the selected country.",
        }
      ),

    phone: z.string().trim().min(1, "Phone number is required."),

    line1: z
      .string()
      .trim()
      .min(3, "Street address must be at least 3 characters.")
      .max(200, "Address is too long."),

    line2: z
      .string()
      .trim()
      .max(100, "Apartment/Suite info must be less than 100 characters.")
      .optional()
      .or(z.literal("")),

    city: z
      .string()
      .trim()
      .min(2, "City must be at least 2 characters.")
      .max(100, "City name is too long."),

    state: z
      .string()
      .trim()
      .min(2, "State or province is required.")
      .max(100, "State/province is too long."),

    postalCode: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),

    paymentMethod: z
      .string()
      .trim()
      .min(1, "Payment method is required."),

    couponCode: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // 1. Validate Phone Number with libphonenumber-js
    if (data.country && data.phone) {
      const isValid = validatePhoneNumber(data.phone, data.country);
      if (!isValid) {
        const country = getCountryByCode(data.country);
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: `Please enter a valid phone number for ${
            country?.name || "the selected country"
          } (e.g. ${country?.dialCode || ""}...).`,
        });
      }
    }

    // 2. Validate Postal Code format
    if (data.country) {
      const isValidPostal = validatePostalCode(data.postalCode || "", data.country);
      if (!isValidPostal) {
        const country = getCountryByCode(data.country);
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["postalCode"],
          message: `Please enter a valid postal code for ${
            country?.name || "the selected country"
          } (${country?.postalCodePlaceholder || ""}).`,
        });
      }
    }

    // 3. Enforce Payment Method is allowed for the destination country
    if (data.country && data.paymentMethod) {
      const country = getCountryByCode(data.country);
      if (country && !country.allowedPaymentMethods.includes(data.paymentMethod.toUpperCase())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentMethod"],
          message: `Payment method ${data.paymentMethod} is not accepted for orders in ${country.name}. Allowed: ${country.allowedPaymentMethods.join(", ")}.`,
        });
      }
    }
  });

/**
 * Full checkout schema including cart items used for the API endpoint.
 */
export const checkoutSchema = checkoutAddressSchema.and(
  z.object({
    idempotencyKey: z.string().trim().min(1, "Idempotency key is required").optional(),
    items: z
      .array(
        z.object({
          variantId: z.string().min(1, "Variant ID is required"),
          quantity: z.number().int().min(1, "Quantity must be at least 1"),
        })
      )
      .min(1, "At least one item is required"),
  })
);

export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;