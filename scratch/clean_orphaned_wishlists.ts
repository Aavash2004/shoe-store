import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("Checking orphaned wishlist_items...");
  const orphanProducts = await prisma.$executeRawUnsafe(`
    DELETE FROM wishlist_items 
    WHERE "productId" IS NOT NULL 
    AND "productId" NOT IN (SELECT id FROM products);
  `);
  console.log("Deleted orphaned wishlist_items by productId:", orphanProducts);

  const orphanVariants = await prisma.$executeRawUnsafe(`
    DELETE FROM wishlist_items 
    WHERE "variantId" IS NOT NULL 
    AND "variantId" NOT IN (SELECT id FROM product_variants);
  `);
  console.log("Deleted orphaned wishlist_items by variantId:", orphanVariants);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
