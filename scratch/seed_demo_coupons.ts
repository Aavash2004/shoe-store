import { prisma } from "../lib/db/prisma";

async function main() {
  const defaultCoupons = [
    {
      id: "coupon-welcome10",
      code: "WELCOME10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minSubtotal: 0,
      maxUses: 1000,
      usedCount: 0,
      isActive: true,
    },
    {
      id: "coupon-save20",
      code: "SAVE20",
      discountType: "FIXED_AMOUNT",
      discountValue: 20,
      minSubtotal: 100,
      maxUses: 1000,
      usedCount: 0,
      isActive: true,
    },
    {
      id: "coupon-vip50",
      code: "VIP50",
      discountType: "PERCENTAGE",
      discountValue: 50,
      minSubtotal: 150,
      maxUses: 1000,
      usedCount: 0,
      isActive: true,
    },
  ];

  for (const c of defaultCoupons) {
    const existing = await (prisma as any).coupon.findUnique({
      where: { code: c.code },
    });
    if (!existing) {
      await (prisma as any).coupon.create({ data: c });
      console.log(`Created coupon: ${c.code}`);
    } else {
      console.log(`Coupon already exists: ${c.code}`);
    }
  }

  const coupons = await (prisma as any).coupon.findMany();
  console.log("=== ALL COUPONS NOW IN DB ===");
  coupons.forEach((c: any) => {
    console.log(`- ${c.code} (${c.discountType}: ${c.discountValue}, Min: $${c.minSubtotal})`);
  });
}

main().finally(async () => {
  await prisma.$disconnect();
  process.exit(0);
});
