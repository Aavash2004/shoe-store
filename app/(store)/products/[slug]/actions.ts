"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function submitProductReview({
  productId,
  productSlug,
  rating,
  comment,
}: {
  productId: string;
  productSlug: string;
  rating: number;
  comment: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to post a review." };
  }

  if (rating < 1 || rating > 5) {
    return { success: false, error: "Please select a rating between 1 and 5 stars." };
  }

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
