import { prisma } from "../lib/db/prisma";

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
    },
  });

  console.log("ALL PRODUCTS IN DB:", JSON.stringify(products, null, 2));

  const travisProducts = products.filter((p) =>
    p.name.toLowerCase().includes("travis")
  );

  console.log("TRAVIS MATCHES:", JSON.stringify(travisProducts, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0));
