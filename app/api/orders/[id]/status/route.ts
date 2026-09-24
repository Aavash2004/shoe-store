import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing order ID parameter" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        subtotal: true,
        shipping: true,
        tax: true,
        discount: true,
        total: true,
        currency: true,
        createdAt: true,
        address: {
          select: {
            fullName: true,
            line1: true,
            line2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            phone: true,
          },
        },
        items: {
          select: {
            id: true,
            productName: true,
            size: true,
            color: true,
            quantity: true,
            price: true,
            variant: {
              select: {
                product: {
                  select: {
                    slug: true,
                    images: {
                      take: 1,
                      orderBy: { position: "asc" },
                      select: { url: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const formattedOrder = {
      ...order,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: Number(item.price),
        product: item.variant?.product || null,
      })),
    };

    return NextResponse.json({ order: formattedOrder }, { status: 200 });
  } catch (err: any) {
    console.error("[Order Status API Error]:", err);
    return NextResponse.json(
      { error: "Failed to query order status" },
      { status: 500 }
    );
  }
}
