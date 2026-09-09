"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

const SubmitReviewSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  productSlug: z.string().min(1, "Product slug is required"),
  rating: z.number().int().min(1, "Please select a rating between 1 and 5 stars.").max(5, "Please select a rating between 1 and 5 stars."),
  comment: z.string().max(1000, "Review comment cannot exceed 1,000 characters.").optional().default(""),
});

export async function submitProductReview(rawInput: {
  productId: string;
  productSlug: string;
  rating: number;
  comment: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to post a review." };
  }

  const parseResult = SubmitReviewSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid review submission." };
  }

  const { productId, productSlug, rating, comment } = parseResult.data;

  try {
    const existing = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId: session.user.id,
        },
      },
    });

    if (existing) {
      await prisma.review.update({
        where: { id: existing.id },
        data: {
          rating,
          comment: comment.trim() || null,
        },
      });
    } else {
      await prisma.review.create({
        data: {
          productId,
          userId: session.user.id,
          rating,
          comment: comment.trim() || null,
        },
      });
    }

    revalidatePath(`/products/${productSlug}`);
    return { success: true };
  } catch (err) {
    console.error("[Submit Review Error]:", err);
    return { success: false, error: "Unable to submit review. Please try again." };
  }
}
