import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get("orderNumber");
  const email = searchParams.get("email");

  if (!orderNumber || !email) {
    return NextResponse.json({ error: "Order number and email required" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber, guestEmail: email },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}