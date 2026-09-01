import { prisma } from "../lib/db/prisma";

async function main() {
  // Find all products that exist
  const existingProducts = await prisma.product.findMany({ select: { id: true } });
  const validIds = new Set(existingProducts.map((p) => p.id));

  // Find all wishlist items
  const items = await prisma.wishlistItem.findMany();
  const orphanIds = items
    .filter((i) => i.productId && !validIds.has(i.productId))
    .map((i) => i.id);

  if (orphanIds.length > 0) {
    console.log(`Deleting ${orphanIds.length} orphaned wishlist items...`);
    await prisma.wishlistItem.deleteMany({
      where: { id: { in: orphanIds } },
    });
    console.log("Cleanup complete!");
  } else {
    console.log("No orphaned wishlist items found.");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0));
