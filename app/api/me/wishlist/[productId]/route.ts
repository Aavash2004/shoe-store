import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: session.user.id },
  });

  if (!wishlist) {
    return NextResponse.json({ error: "Wishlist not found" }, { status: 404 });
  }

  const existingItem = await prisma.wishlistItem.findFirst({
    where: {
      wishlistId: wishlist.id,
      OR: [
        { id: productId },
        { productId },
        { variantId: productId },
      ],
    },
  });

  if (!existingItem) {
    return NextResponse.json({ error: "Item not in wishlist" }, { status: 404 });
  }

  await prisma.wishlistItem.delete({
    where: { id: existingItem.id },
  });

  return NextResponse.json({ message: "Removed from wishlist", saved: false });
}
