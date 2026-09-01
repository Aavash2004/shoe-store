import { z } from "zod";

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
  phone: z.string().min(7, "Phone number must be at least 7 digits."),
  line1: z.string().min(5, "Address must be at least 5 characters."),
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