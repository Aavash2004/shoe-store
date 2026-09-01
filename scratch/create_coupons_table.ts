import { prisma } from "../lib/db/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "coupons" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
      "discountValue" DECIMAL(10,2) NOT NULL,
      "minSubtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
      "maxUses" INTEGER,
      "usedCount" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "expiresAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");
  `);

  // Seed default sample promo codes if table is empty
  const count: number = await (prisma as any).coupon.count();
  if (count === 0) {
    await (prisma as any).coupon.createMany({
      data: [
        {
          code: "WELCOME10",
          discountType: "PERCENTAGE",
          discountValue: 10,
          minSubtotal: 0,
        },
        {
          code: "ABXV20",
          discountType: "FIXED_AMOUNT",
          discountValue: 20,
          minSubtotal: 100,
        },
      ],
    });
    console.log("Seeded sample promo codes: WELCOME10 (10% OFF), ABXV20 ($20 OFF)");
  }

  console.log("Coupons table ready!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0));
