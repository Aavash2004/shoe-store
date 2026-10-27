import { prisma } from "../lib/db/prisma";

async function main() {
  const coupons = await (prisma as any).coupon.findMany();
  console.log("=== COUPONS IN DB ===");
  coupons.forEach((c: any) => {
    console.log(`- Code: ${c.code} | Type: ${c.discountType} | Value: ${c.discountValue} | Min: ${c.minSubtotal} | Used: ${c.usedCount}/${c.maxUses || "∞"}`);
  });
}

main().finally(async () => {
  await prisma.$disconnect();
  process.exit(0);
});
