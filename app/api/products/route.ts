import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { productQuerySchema } from "@/lib/validations/product";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = productQuerySchema.safeParse({
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    size: searchParams.get("size") ?? undefined,
    color: searchParams.get("color") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
  }

  const { search, category, size, color, sort } = parsed.data;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(search && {
        name: { contains: search, mode: "insensitive" },
      }),
      ...(category && {
        category: { slug: category },
      }),
      ...(size || color
        ? {
            variants: {
              some: {
                isActive: true,
                ...(size && { size }),
                ...(color && { color }),
              },
            },
          }
        : {}),
    },
    include: {
      category: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true } },
    },
  });

  // compute a display price (lowest active variant price) per product
  const withPrice = products.map((p: (typeof products)[number]) => {
  const prices = p.variants.map((v: (typeof p.variants)[number]) => Number(v.price));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  return { ...p, minPrice };
});

if (sort === "price-asc") {
  withPrice.sort((a: (typeof withPrice)[number], b: (typeof withPrice)[number]) => a.minPrice - b.minPrice);
} else if (sort === "price-desc") {
  withPrice.sort((a: (typeof withPrice)[number], b: (typeof withPrice)[number]) => b.minPrice - a.minPrice);
}

  return NextResponse.json({ products: withPrice });
}