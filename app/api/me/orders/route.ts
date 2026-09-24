import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const whereClause: any = {
    userId: session.user.id,
  };

  if (status && status !== "ALL") {
    whereClause.status = status.toUpperCase();
  }

  if (q) {
    whereClause.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      {
        items: {
          some: {
            productName: { contains: q, mode: "insensitive" },
          },
        },
      },
    ];
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: {
                    take: 1,
                    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
                  },
                },
              },
            },
          },
        },
      },
      address: true,
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const formattedOrders = orders.map((order) => ({
    ...order,
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    tax: Number(order.tax),
    discount: Number(order.discount),
    total: Number(order.total),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  }));

  return NextResponse.json({ orders: formattedOrders });
}
