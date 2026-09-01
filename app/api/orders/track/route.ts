import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawOrderNumber = searchParams.get("orderNumber")?.trim();
  const rawEmail = searchParams.get("email")?.trim();

  if (!rawOrderNumber || !rawEmail) {
    return NextResponse.json(
      { error: "Order number and email required" },
      { status: 400 }
    );
  }

  const orderNumber = rawOrderNumber.toUpperCase();
  const email = rawEmail.toLowerCase();

  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber,
      },
      include: {
        user: { select: { email: true, name: true } },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { take: 1, orderBy: { position: "asc" } },
                  },
                },
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
        address: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found. Please check your order number." },
        { status: 404 }
      );
    }

    const orderEmail = (order.guestEmail || order.user?.email || "").toLowerCase().trim();
    if (orderEmail !== email) {
      return NextResponse.json(
        { error: "Order not found. Email address does not match this order." },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    const errorMessage =
      err?.message ||
      err?.description ||
      (typeof err === "object" ? JSON.stringify(err) : String(err));

    console.error("[Track Order API Error]:", errorMessage);
    return NextResponse.json(
      { error: "An error occurred while tracking your order. Please try again." },
      { status: 500 }
    );
  }
}