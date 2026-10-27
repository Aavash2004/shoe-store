import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("==========================================");
  console.log("🔎 AUDITING DATABASE SCHEMA & PRISMA MODELS");
  console.log("==========================================");

  // 1. Get all public tables
  const tables: any[] = await prisma.$queryRawUnsafe(`
    SELECT table_name::text 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log(`\nFound ${tables.length} tables in PostgreSQL:`);
  console.log(tables.map((t) => t.table_name).join(", "));

  // 2. Test querying every model in Prisma Client to ensure no column mismatch
  const modelsToTest = [
    { name: "user", fn: () => prisma.user.findFirst() },
    { name: "account", fn: () => prisma.account.findFirst() },
    { name: "session", fn: () => prisma.session.findFirst() },
    { name: "passwordResetToken", fn: () => prisma.passwordResetToken.findFirst() },
    { name: "address", fn: () => prisma.address.findFirst() },
    { name: "category", fn: () => prisma.category.findFirst() },
    { name: "product", fn: () => prisma.product.findFirst() },
    { name: "productVariant", fn: () => prisma.productVariant.findFirst() },
    { name: "productImage", fn: () => prisma.productImage.findFirst() },
    { name: "cart", fn: () => prisma.cart.findFirst() },
    { name: "cartItem", fn: () => prisma.cartItem.findFirst() },
    { name: "wishlist", fn: () => prisma.wishlist.findFirst() },
    { name: "wishlistItem", fn: () => prisma.wishlistItem.findFirst() },
    { name: "order", fn: () => prisma.order.findFirst() },
    { name: "orderItem", fn: () => prisma.orderItem.findFirst() },
    { name: "orderStatusHistory", fn: () => prisma.orderStatusHistory.findFirst() },
    { name: "review", fn: () => prisma.review.findFirst() },
    { name: "adminActivityLog", fn: () => prisma.adminActivityLog.findFirst() },
    { name: "coupon", fn: () => (prisma as any).coupon.findFirst() },
  ];

  console.log("\nTesting Prisma query on each model...");
  const errors: string[] = [];

  for (const model of modelsToTest) {
    try {
      await model.fn();
      console.log(`  ✅ Model '${model.name}': OK`);
    } catch (err: any) {
      console.error(`  ❌ Model '${model.name}': FAILED!`, err.message);
      errors.push(`${model.name}: ${err.message}`);
    }
  }

  // 3. Count data records
  console.log("\n--- Checking Data Counts ---");
  try {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const variantCount = await prisma.productVariant.count();
    const categoryCount = await prisma.category.count();
    const orderCount = await prisma.order.count();
    const reviewCount = await prisma.review.count();
    const couponCount = await (prisma as any).coupon.count();

    console.log(`Users: ${userCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Variants: ${variantCount}`);
    console.log(`Categories: ${categoryCount}`);
    console.log(`Orders: ${orderCount}`);
    console.log(`Reviews: ${reviewCount}`);
    console.log(`Coupons: ${couponCount}`);
  } catch (err: any) {
    console.error("Error checking counts:", err.message);
    errors.push(`Counts check: ${err.message}`);
  }

  console.log("\n==========================================");
  if (errors.length === 0) {
    console.log("🎉 ALL MODELS AND DATABASE TABLES ARE 100% HEALTHY!");
  } else {
    console.log(`⚠️ FOUND ${errors.length} SCHEMA MISMATCHES:`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }
  console.log("==========================================");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
