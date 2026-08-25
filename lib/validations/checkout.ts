import { z } from "zod";

export const checkoutSchema = z.object({
  guestEmail: z.string().email().optional(),
  guestName: z.string().min(1).optional(),
  fullName: z.string().min(1),
  phone: z.string().min(7),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  items: z.array(
    z.object({
      variantId: z.string(),
      quantity: z.number().min(1),
    })
  ).min(1),
});