import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

function getRelevanceScore(
  product: {
    name: string;
    brand: string | null;
    slug: string;
    category: { name: string };
  },
  query: string
): number {
  const qLower = query.toLowerCase();
  const nameLower = product.name.toLowerCase();
  const slugLower = product.slug.toLowerCase();
  const brandLower = (product.brand ?? "").toLowerCase();
  const categoryLower = product.category.name.toLowerCase();

  // Priority 1: Product name or slug starts with search query (e.g. "React Street" for "r")
  if (nameLower.startsWith(qLower) || slugLower.startsWith(qLower)) {
    return 1;
  }

  // Priority 2: A word inside product name starts with search query (e.g. "Ridge Runner" or "Terrex Trail" for "r")
  if (
    nameLower.includes(` ${qLower}`) ||
    nameLower.includes(`-${qLower}`) ||
    slugLower.includes(`-${qLower}`)
  ) {
    return 2;
  }

  // Priority 3: Brand starts with search query (e.g. "Nike" for "n")
  if (brandLower.startsWith(qLower)) {
    return 3;
  }

  // Priority 4: Category name starts with search query (e.g. "Running" for "r")
  if (categoryLower.startsWith(qLower)) {
    return 4;
  }

  // Priority 5: Partial text match anywhere in name, brand, or description
  if (nameLower.includes(qLower) || slugLower.includes(qLower)) {
    return 5;
  }

  return 6;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ suggestions: [] });
  }

  const selectFields = {
    id: true,
    name: true,
    slug: true,
    brand: true,
    category: { select: { name: true } },
    images: {
      orderBy: { position: "asc" as const },
      take: 1,
      select: { url: true },
    },
    variants: {
      where: { isActive: true },
      select: { price: true },
      take: 5,
    },
  };

  try {
    // Query candidate products matching q
    const rawProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 20,
      select: selectFields,
    });

    // Rank candidates by exact relevance score
    const scoredProducts = rawProducts.map((product) => ({
      product,
      score: getRelevanceScore(product, q),
    }));

    // Sort by relevance score ascending (Score 1 highest), then alphabetically
    scoredProducts.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.product.name.localeCompare(b.product.name);
    });

    // Take top 5 ranked suggestions
    const topRanked = scoredProducts.slice(0, 5).map((item) => item.product);

    const suggestions = topRanked.map((p) => {
      const minPrice = p.variants.length
        ? Math.min(...p.variants.map((v) => Number(v.price)))
        : 0;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand ?? "ABXV",
        category: p.category.name,
        image: p.images[0]?.url ?? "/images/Shoes/s05.avif",
        price: minPrice,
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("[Search Autocomplete API Error]:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
