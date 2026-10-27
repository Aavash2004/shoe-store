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
    if (p.isActive) {
      console.log(`- Product: ${p.name} (ID: ${p.id})`);
      p.variants.forEach((v) => {
        console.log(`    Variant ID: ${v.id} | Size: ${v.size} | Color: ${v.color} | SKU: ${v.sku} | Price: ${v.price}`);
      });
    }
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
