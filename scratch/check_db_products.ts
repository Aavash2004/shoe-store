import "dotenv/config";
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
    console.log(`- ID: ${p.id} | Name: ${p.name} | Slug: ${p.slug} | Active: ${p.isActive}`);
  });
}

main()
  .then(async () => {
    console.log("Done checking DB products.");
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
