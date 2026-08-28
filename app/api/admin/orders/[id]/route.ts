import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
  note: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdminApi();
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateOrderStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid status value", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { status, note } = parsed.data;

  // Check if order exists
  const existingOrder = await prisma.order.findUnique({
    where: { id },
  });

  if (!existingOrder) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Update order status and log in OrderStatusHistory
  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status,
      statusHistory: {
        create: {
          status,
          note: note || `Order status updated to ${status} by admin`,
        },
      },
    },
    include: {
      items: true,
      address: true,
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({
    message: `Order status updated to ${status}`,
    order: updatedOrder,
  });
}

