import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/services/stripe";

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
        stripePaymentIntentId: true,
        couponCode: true,
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

    // Real-time Stripe payment status reconciliation (ensures local dev & fast webhooks succeed)
    let currentPaymentStatus = order.paymentStatus;
    let currentStatus = order.status;

    if (
      order.paymentMethod === "STRIPE" &&
      order.paymentStatus === "PENDING" &&
      order.stripePaymentIntentId
    ) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        if (paymentIntent.status === "succeeded") {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: "PAID",
              status: "PROCESSING",
            },
          });
          currentPaymentStatus = "PAID";
          currentStatus = "PROCESSING";

          if (order.couponCode) {
            await prisma.coupon.updateMany({
              where: { code: order.couponCode },
              data: { usedCount: { increment: 1 } },
            });
          }

          await prisma.orderStatusHistory.create({
            data: {
              orderId: order.id,
              status: "PAID",
              note: `Payment confirmed via Stripe (Amount: ${paymentIntent.currency.toUpperCase()} ${(
                paymentIntent.amount / 100
              ).toFixed(2)}, PI: ${paymentIntent.id})`,
            },
          }).catch(() => {});
        }
      } catch (stripeErr) {
        console.warn("[Order Status] Stripe status reconciliation error:", stripeErr);
      }
    }

    // Mask phone number to prevent PII exposure (e.g. ***-***-1234)
    const maskedPhone = order.address?.phone
      ? order.address.phone.length > 4
        ? `***-***-${order.address.phone.slice(-4)}`
        : order.address.phone
      : null;

    const formattedOrder = {
      ...order,
      status: currentStatus,
      paymentStatus: currentPaymentStatus,
      address: order.address
        ? {
            ...order.address,
            phone: maskedPhone,
          }
        : null,
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
