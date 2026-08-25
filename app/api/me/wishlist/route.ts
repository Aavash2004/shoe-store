import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const toggleWishlistSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
              variants: true,
              category: true,
            },
          },
          variant: {
            include: {
              product: {
                include: {
                  images: true,
                  variants: true,
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                variants: true,
                category: true,
              },
            },
            variant: {
              include: {
                product: {
                  include: {
                    images: true,
                    variants: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // Format products array nicely for client consuming ProductCard
  const formattedItems = wishlist.items.map((item) => {
    const prod = item.product || item.variant?.product;
    const firstVariant = prod?.variants?.[0];
    const primaryImg = prod?.images?.find((img) => img.isPrimary) || prod?.images?.[0];

    return {
      id: item.id,
      productId: prod?.id,
      slug: prod?.slug,
      name: prod?.name || "Shoe Product",
      brand: prod?.brand || "ShoeStore",
      category: prod?.category?.name || "Footwear",
      price: firstVariant ? Number(firstVariant.price) : 0,
      image: primaryImg?.url || "/images/Shoes/s05.avif",
      stock: firstVariant ? firstVariant.stock : 0,
      variants: prod?.variants || [],
      createdAt: item.createdAt,
    };
  });

  return NextResponse.json({ items: formattedItems, count: formattedItems.length });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = toggleWishlistSchema.safeParse(body);

  if (!parsed.success || (!parsed.data.productId && !parsed.data.variantId)) {
    return NextResponse.json(
      { error: "productId or variantId is required" },
      { status: 400 }
    );
  }

  const { productId, variantId } = parsed.data;

  // Find or create wishlist
  let wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
  });

  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId: session.user.id },
    });
  }

  // Check if item already exists in user's wishlist
  const existing = await prisma.wishlistItem.findFirst({
    where: {
      wishlistId: wishlist.id,
      OR: [
        ...(productId ? [{ productId }] : []),
        ...(variantId ? [{ variantId }] : []),
      ],
    },
  });

  if (existing) {
    // Toggle off (remove)
    await prisma.wishlistItem.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ saved: false, message: "Removed from wishlist" });
  } else {
    // Toggle on (add)
    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId: productId || null,
        variantId: variantId || null,
      },
    });
    return NextResponse.json({ saved: true, message: "Added to wishlist" });
  }
}
