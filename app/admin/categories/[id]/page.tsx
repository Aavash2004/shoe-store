import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
    },
  });

  if (!category) {
    notFound();
  }

  return (
    <CategoryForm
      initialData={{
        id: category.id,
        name: category.name,
        slug: category.slug,
        isActive: category.isActive,
        productCount: category._count.products,
      }}
    />
  );
}
