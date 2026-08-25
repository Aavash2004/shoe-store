import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateAddressSchema = z.object({
  title: z.string().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Strict ownership check
  const existingAddress = await prisma.address.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!existingAddress) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateAddressSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.address.update({
    where: { id },
    data,
  });

  return NextResponse.json({ address: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Strict ownership check
  const existingAddress = await prisma.address.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!existingAddress) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  await prisma.address.delete({
    where: { id },
  });

  // If deleted address was default, set another address as default if present
  if (existingAddress.isDefault) {
    const nextAddress = await prisma.address.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    if (nextAddress) {
      await prisma.address.update({
        where: { id: nextAddress.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ message: "Address deleted" });
}
