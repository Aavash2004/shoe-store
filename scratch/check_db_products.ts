import { prisma } from "../lib/db/prisma";

async function main() {
  const allProducts = await prisma.product.findMany({
    include: {
      category: true,
      variants: true,
      images: true,
    },
  });

  console.log("=== DB PRODUCTS CHECK ===");
  console.log("Total Products in DB:", allProducts.length);
  allProducts.forEach((p) => {
    console.log(`- ID: ${p.id} | Name: ${p.name} | Slug: ${p.slug} | Active: ${p.isActive} | DeletedAt: ${p.deletedAt}`);
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0));
