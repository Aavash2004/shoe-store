"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/authorization";

export async function deleteReview(reviewId: string) {
  const session = await requireAdmin();

  try {
    const existing = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: { select: { name: true, slug: true } },
        user: { select: { email: true } },
      },
    });

    if (!existing) {
      return { success: false, error: "Review not found" };
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Admin audit log
    const sessionUserId = (session.user as any)?.id;
    const sessionEmail = session.user?.email?.toLowerCase();
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(sessionUserId ? [{ id: sessionUserId }] : []),
          ...(sessionEmail ? [{ email: sessionEmail }] : []),
        ],
      },
      select: { id: true },
    });

    if (adminUser) {
      await prisma.adminActivityLog.create({
        data: {
          adminId: adminUser.id,
          action: "DELETED_PRODUCT_REVIEW",
          entity: "Review",
          entityId: reviewId,
          metadata: {
            productName: existing.product.name,
            productSlug: existing.product.slug,
            reviewerEmail: existing.user.email,
            rating: existing.rating,
          },
        },
      });
    }

    revalidatePath("/admin/reviews");
    if (existing.product.slug) {
      revalidatePath(`/products/${existing.product.slug}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Delete Review Error]:", err);
    return { success: false, error: "Failed to delete review." };
  }
}
