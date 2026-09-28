import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  canTransition,
  isTerminalStatus,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/order-status";

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

  const currentStatus = existingOrder.status as OrderStatus;
  const targetStatus = status as OrderStatus;

  if (currentStatus === targetStatus) {
    return NextResponse.json({
      message: `Order is already in ${status}`,
      order: existingOrder,
    });
  }

  if (isTerminalStatus(currentStatus)) {
    return NextResponse.json(
      { error: `Order is in terminal state "${ORDER_STATUS_LABELS[currentStatus] || currentStatus}" and cannot be changed.` },
      { status: 400 }
    );
  }

  if (!canTransition(currentStatus, targetStatus)) {
    return NextResponse.json(
      { error: `Illegal transition: Cannot change order from "${ORDER_STATUS_LABELS[currentStatus] || currentStatus}" to "${ORDER_STATUS_LABELS[targetStatus] || targetStatus}".` },
      { status: 400 }
    );
  }

  const updateResult = await prisma.order.updateMany({
    where: { id, status: currentStatus },
    data: { status: targetStatus },
  });

  if (updateResult.count === 0) {
    return NextResponse.json(
      { error: `Order status was concurrently modified. Please refresh.` },
      { status: 409 }
    );
  }

  await prisma.orderStatusHistory.create({
    data: {
      orderId: id,
      status: targetStatus,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      changedBy: authResult.session?.user?.email || "Admin API",
      note: note || `Order status updated to ${targetStatus} by admin API`,
    },
  });

  const updatedOrder = await prisma.order.findUnique({
    where: { id },
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

