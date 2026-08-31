import { z } from "zod";

export const checkoutSchema = z.object({
  guestEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  guestName: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(7, "Phone number is required"),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  items: z
    .array(
      z.object({
        variantId: z.string(),
        quantity: z.number().min(1),
      })
    )
    .min(1, "At least one item is required"),
});