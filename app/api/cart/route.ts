import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

const addItemSchema = z.object({
  variantId: z.string(),
  quantity: z.number().min(1).default(1),
});

const updateSchema = z.object({
  variantId: z.string(),
  quantity: z.number().min(0),
});

async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return cart;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const cart = await getOrCreateCart(userId);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { variant: { include: { product: { include: { images: true } } } } },
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const cart = await getOrCreateCart(userId);
  const { variantId, quantity } = parsed.data;

  const item = await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: { increment: quantity } },
    create: { cartId: cart.id, variantId, quantity },
  });

  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const cart = await getOrCreateCart(userId);
  const { variantId, quantity } = parsed.data;

  if (quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
    return NextResponse.json({ success: true });
  }

  const item = await prisma.cartItem.update({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    data: { quantity },
  });

  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get("variantId");
  if (!variantId) {
    return NextResponse.json({ error: "variantId required" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });

  return NextResponse.json({ success: true });
}