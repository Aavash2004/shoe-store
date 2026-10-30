import { prisma } from "@/lib/db/prisma";
import { StaffInventoryClient, type StaffVariant } from "@/components/staff/StaffInventoryClient";
import { requireStaff } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function StaffInventoryPage() {
  await requireStaff();

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
          brand: true,
          images: {
            take: 1,
            orderBy: { position: "asc" },
            select: { url: true },
          },
        },
      },
    },
  });

  const formattedVariants: StaffVariant[] = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    stock: v.stock,
    product: {
      id: v.product.id,
      name: v.product.name,
      brand: v.product.brand,
      image: v.product.images[0]?.url || "/images/Shoes/gmm.jpeg",
    },
  }));

  return <StaffInventoryClient initialVariants={formattedVariants} />;
}
