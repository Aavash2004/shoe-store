import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("Adding missing columns to orders table...");
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stockReserved" BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log("Added stockReserved column.");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "manualReviewReason" TEXT;
  `);
  console.log("Added manualReviewReason column.");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
  `);
  console.log("Added cancelReason column.");

  const result: any[] = await prisma.$queryRawUnsafe(`
    SELECT column_name::text AS column_name, data_type::text AS data_type, column_default::text AS column_default 
    FROM information_schema.columns 
    WHERE table_name = 'orders';
  `);
  console.log("=== UPDATED ORDERS COLUMNS ===");
  result.forEach((c) => console.log(`- ${c.column_name} (${c.data_type}, default: ${c.column_default})`));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
