import { prisma } from "@/lib/db/prisma";
import { AdminInventoryClient, type AdminInventoryVariant } from "@/components/admin/AdminInventoryClient";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      product: { deletedAt: null },
    },
    orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          brand: true,
          category: { select: { name: true } },
          images: {
            take: 1,
            orderBy: { position: "asc" },
            select: { url: true },
          },
        },
      },
    },
  });

  const formattedVariants: AdminInventoryVariant[] = variants.map((v) => ({
    id: v.id,
    size: v.size,
    color: v.color,
    stock: v.stock,
    price: Number(v.price),
    productId: v.productId,
    product: {
      id: v.product.id,
      name: v.product.name,
      slug: v.product.slug,
      brand: v.product.brand,
      category: v.product.category,
      image: v.product.images[0]?.url || "/images/Shoes/gmm.jpeg",
    },
  }));

  return <AdminInventoryClient initialVariants={formattedVariants} />;
}