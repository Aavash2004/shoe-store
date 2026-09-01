import { z } from "zod";

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  sort: z.enum(["price-asc", "price-desc"]).optional(),
});

const productImageSchema = z.object({
  url: z.string().min(1, "Image URL is required"),
  altText: z.string().optional(),
  isPrimary: z.boolean(),
  position: z.number(),
});

const productVariantSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  sku: z.string().min(1, "SKU is required"),
  price: z.number().min(0, "Price must be positive"),
  stock: z.number().min(0, "Stock must be non-negative"),
});

// Used when EDITING a product.
// Existing variants have an ID.
// New variants don't.
const updateProductVariantSchema = productVariantSchema.extend({
  id: z.string().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().min(1, "Description is required"),
  brand: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  isActive: z.boolean(),
  images: z
    .array(productImageSchema)
    .min(1, "At least one image is required"),
  variants: z
    .array(productVariantSchema)
    .min(1, "At least one variant is required"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema
  .omit({
    variants: true,
  })
  .partial()
  .extend({
    id: z.string().min(1),

    variants: z
      .array(updateProductVariantSchema)
      .min(1, "At least one variant is required")
      .optional(),
  });

export type UpdateProductInput = z.infer<typeof updateProductSchema>;