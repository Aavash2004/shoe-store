import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { checkGlobalOrderStatusRateLimit, checkPerOrderRateLimit, getClientIp } from "@/lib/security/rateLimit";

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

    // 1. Rate limiting:
    const clientIp = getClientIp(request);

    // 1a. Global per-IP rate limit across all orders (protects against ID scanning/enumeration across the catalog)
    const globalRateLimitResult = await checkGlobalOrderStatusRateLimit(`order-status-global:${clientIp}`);
    if (!globalRateLimitResult.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((globalRateLimitResult.reset - Date.now()) / 1000)
      );
      return NextResponse.json(
        { error: "Too many status queries. Please wait a minute before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(globalRateLimitResult.limit),
            "X-RateLimit-Remaining": String(globalRateLimitResult.remaining),
          },
        }
      );
    }

    // 1b. Per-order rate limit (keyed on IP + specific order ID)
    const rateLimitResult = await checkPerOrderRateLimit(`order-status:${clientIp}:${id}`);
    if (!rateLimitResult.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      );
      return NextResponse.json(
        { error: "Too many status checks. Please wait a minute before trying again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    // 2. Pure read-only lookup (NO Stripe retrieve, NO payment confirmation in GET)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        address: true,
        items: {
          include: {
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

    // 3. Authorization check: owner, admin, or matching email via x-order-email header only (no ?email= URL param)
    let session = null;
    try {
      session = await auth();
    } catch {
      // In isolated test runner or outside App Router context
    }

    const emailHeader = request.headers.get("x-order-email")?.trim().toLowerCase();

    const orderCustomerEmail = (
      order.user?.email || order.guestEmail || ""
    ).toLowerCase();

    const isOwner = Boolean(
      session?.user?.id && session.user.id === order.userId
    );
    const isAdmin = Boolean(session?.user?.role === "ADMIN");
    const isMatchingEmail = Boolean(
      emailHeader && orderCustomerEmail && emailHeader === orderCustomerEmail
    );

    const isAuthorized = isOwner || isAdmin || isMatchingEmail;

    // 4. Return ONLY status/paymentStatus unless owner or matching email (BUG-003 fix)
    if (!isAuthorized) {
      return NextResponse.json(
        {
          order: {
            id: order.id,
            status: order.status,
            paymentStatus: order.paymentStatus,
          },
        },
        { status: 200 }
      );
    }

    // 5. Authorized response: Return full details with masked phone
    const maskedPhone = order.address?.phone
      ? order.address.phone.length > 4
        ? `***-***-${order.address.phone.slice(-4)}`
        : order.address.phone
      : null;

    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      currency: order.currency,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      couponCode: order.couponCode,
      createdAt: order.createdAt,
      address: order.address
        ? {
            ...order.address,
            phone: maskedPhone,
          }
        : null,
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
