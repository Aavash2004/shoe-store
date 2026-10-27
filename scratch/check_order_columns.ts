import { prisma } from "../lib/db/prisma";

async function main() {
  const result: any[] = await prisma.$queryRawUnsafe(`
    SELECT column_name::text AS column_name, data_type::text AS data_type, column_default::text AS column_default 
    FROM information_schema.columns 
    WHERE table_name = 'orders';
  `);
  console.log("=== CURRENT ORDERS COLUMNS ===");
  result.forEach((c) => console.log(`- ${c.column_name} (${c.data_type}, default: ${c.column_default})`));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
