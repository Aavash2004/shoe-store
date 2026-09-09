import { z } from "zod";

// Nepali mobile number regex: 10 digits starting with 98 or 97, optionally prefixed with +977 or 977
const nepaliPhoneRegex = /^(\+?977)?(98|97)\d{8}$/;

export const checkoutSchema = z.object({
  guestEmail: z
    .string()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  guestName: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  phone: z
    .string()
    .min(1, "Phone number is required.")
    .transform((val) => val.trim().replace(/[\s-]/g, ""))
    .refine(
      (val) => nepaliPhoneRegex.test(val),
      "Please enter a valid 10-digit Nepali mobile number starting with 98 or 97 (e.g. 9841234567 or +977 9841234567)."
    ),
  line1: z.string().min(3, "Street address is required."),
  line2: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  city: z.string().min(2, "City is required."),
  state: z.string().min(2, "State or province is required."),
  postalCode: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (!v ? "" : v)),
  country: z.string().min(2, "Country is required."),
  items: z
    .array(
      z.object({
        variantId: z.string(),
        quantity: z.number().min(1),
      })
    )
    .min(1, "At least one item is required"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;