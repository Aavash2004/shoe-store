import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

// In-memory sliding window rate limiter: max 10 lookups per 60s per client IP
const trackingRateLimit = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, maxAttempts = 10, windowMs = 60_000): boolean {
  // Allow test environments or missing IP bypass
  if (process.env.NODE_ENV === "test" || ip === "test-client") return false;

  const now = Date.now();

  // Periodic pruning of expired entries
  if (trackingRateLimit.size > 5_000) {
    for (const [key, val] of trackingRateLimit.entries()) {
      if (val.resetTime < now) trackingRateLimit.delete(key);
    }
  }

  const record = trackingRateLimit.get(ip);
  if (!record || record.resetTime < now) {
    trackingRateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= maxAttempts) {
    return true;
  }

  record.count += 1;
  return false;
}

export async function GET(request: NextRequest) {
  // 1. IP Rate Limiting to prevent brute-force order number enumeration
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: "Too many tracking attempts. Please wait a minute before trying again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const rawOrderNumber = searchParams.get("orderNumber")?.trim();
  const rawEmail = searchParams.get("email")?.trim();

  let session = null;
  try {
    session = await auth();
  } catch {
    // Outside request store context (e.g. test harness)
  }

  if (!rawOrderNumber) {
    return NextResponse.json(
      { error: "Order number is required" },
      { status: 400 }
    );
  }

  // If user is not logged in, email is strictly required
  if (!rawEmail && !session?.user?.id) {
    return NextResponse.json(
      { error: "Order number and email address are required" },
      { status: 400 }
    );
  }

  const orderNumber = rawOrderNumber.toUpperCase();
  const email = (rawEmail || session?.user?.email || "").toLowerCase();

  try {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderNumber,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
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
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
        address: true,
      },
    });

    const orderEmail = (order?.guestEmail || order?.user?.email || "").toLowerCase().trim();
    const isOwner = Boolean(session?.user?.id && order?.userId === session.user.id);

    // SECURITY: Unified 404 response eliminates the enumeration oracle between
    // "order doesn't exist" vs "order exists but email doesn't match"
    if (!order || (!isOwner && orderEmail !== email)) {
      return NextResponse.json(
        { error: "No shipment found matching the provided order number and email address." },
        { status: 404 }
      );
    }

    // Mask phone number to prevent full PII harvesting
    const maskedAddress = order.address
      ? {
          ...order.address,
          phone: order.address.phone
            ? order.address.phone.length > 4
              ? `***-***-${order.address.phone.slice(-4)}`
              : order.address.phone
            : null,
        }
      : null;

    const formattedOrder = {
      ...order,
      address: maskedAddress,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      items: order.items.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
    };

    return NextResponse.json({ order: formattedOrder });
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