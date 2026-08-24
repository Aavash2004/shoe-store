import { z } from "zod";

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  sort: z.enum(["price-asc", "price-desc"]).optional(),
});