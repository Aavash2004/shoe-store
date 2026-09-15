import { prisma } from "@/lib/db/prisma";
import { AdminProductsClient, type AdminProductItem } from "@/components/admin/AdminProductsClient";

export const dynamic = "force-dynamic";

async function executeAdminProductsQueries(): Promise<AdminProductItem[]> {
  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        variants: { select: { price: true, stock: true, size: true } },
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      isActive: p.isActive,
      category: p.category,
      images: p.images,
      variants: p.variants.map((v) => ({
        price: Number(v.price),
        stock: v.stock,
        size: v.size,
      })),
      createdAt: p.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("[AdminProductsPage DB] Query failed:", err);
    return [];
  }
}

export default async function AdminProductsPage() {
  const products = await executeAdminProductsQueries();

  return <AdminProductsClient initialProducts={products} />;
}