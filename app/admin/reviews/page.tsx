import { prisma } from "@/lib/db/prisma";
import { AdminReviewsClient, type AdminReviewRow } from "@/components/admin/AdminReviewsClient";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: {
            take: 1,
            orderBy: { position: "asc" },
            select: { url: true },
          },
        },
      },
    },
  });

  const formattedReviews: AdminReviewRow[] = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    user: {
      name: r.user.name,
      email: r.user.email,
    },
    product: {
      id: r.product.id,
      name: r.product.name,
      slug: r.product.slug,
      image: r.product.images[0]?.url || "/images/Shoes/gmm.jpeg",
    },
  }));

  return <AdminReviewsClient initialReviews={formattedReviews} />;
}
