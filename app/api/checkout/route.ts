import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { checkoutSchema } from "@/lib/validations/checkout";
import { isCountryEnabled } from "@/lib/constants/countries";
import {
  calculateOrderPricing,
  PricingError,
} from "@/lib/checkout/pricing";
import {
  decrementStockWithLock,
  InsufficientStockError,
} from "@/lib/checkout/stock";

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SH-${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload in request body", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  // 1. Mandatory Idempotency Key validation
  // Clients MUST provide an idempotency key either via header or body
  const idempotencyKey =
    request.headers.get("idempotency-key")?.trim() ||
    request.headers.get("x-idempotency-key")?.trim() ||
    (typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "");

  if (!idempotencyKey) {
    return NextResponse.json(
      {
        error:
          "Missing required idempotency key. Please provide 'Idempotency-Key' header or 'idempotencyKey' in the request body.",
        code: "MISSING_IDEMPOTENCY_KEY",
      },
      { status: 400 }
    );
  }

  // 2. Validate input schema
  const parsed = checkoutSchema.safeParse({ ...body, idempotencyKey });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        details: parsed.error.flatten(),
        code: "VALIDATION_ERROR",
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 3. Destination country allowlist enforcement
  if (!isCountryEnabled(data.country)) {
    return NextResponse.json(
      {
        error: `Shipping is not currently available for country code: ${data.country}`,
        code: "COUNTRY_DISABLED",
      },
      { status: 400 }
    );
  }

  // 4. Session & Guest checkout validation
  let session: any = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  const userId = session?.user ? (session.user as any).id : null;

  if (!userId) {
    if (!data.guestName && data.fullName) {
      data.guestName = data.fullName;
    }
    if (!data.guestEmail || !data.guestName) {
      return NextResponse.json(
        {
          error: "Guest checkout requires both full name and email address.",
          code: "GUEST_INFO_REQUIRED",
        },
        { status: 400 }
      );
    }
  }

  try {
    // 5. Interactive transaction with explicit timeout configuration:
    // maxWait: 5s to acquire a connection, timeout: 10s execution window
    const order = await prisma.$transaction(
      async (tx) => {
        // Step A: Decrement stock with alphanumeric sort to guarantee AB-BA deadlock prevention
        await decrementStockWithLock(tx, data.items);

        // Step B: Calculate server-side pricing and tax (Never trust client pricing)
        const pricing = await calculateOrderPricing(
          data.items,
          data.country,
          data.couponCode,
          tx
        );

        // Step C: Nepal Domestic Rule: COD max cap Rs. 50,000
        if (
          data.country === "NP" &&
          data.paymentMethod.toUpperCase() === "COD" &&
          pricing.total > 50000
        ) {
          throw new PricingError(
            "Cash on Delivery is limited to orders up to Rs. 50,000. Please choose another payment method or reduce cart quantity.",
            "COD_LIMIT_EXCEEDED"
          );
        }

        // Step D: Create shipping address record
        const address = await tx.address.create({
          data: {
            userId,
            fullName: data.fullName,
            phone: data.phone,
            line1: data.line1,
            line2: data.line2 || null,
            city: data.city,
            state: data.state,
            postalCode: data.postalCode || "N/A",
            country: data.country,
          },
        });

        // Step E: Create Order with transactionId = idempotencyKey
        // The DB unique index ensures single-flight guarantee at the database level
        const newOrder = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId,
            guestEmail: userId ? null : data.guestEmail,
            guestName: userId ? null : data.guestName,
            addressId: address.id,
            paymentMethod: data.paymentMethod.toUpperCase(),
            transactionId: idempotencyKey,
            currency: pricing.currency,
            exchangeRate: pricing.exchangeRate,
            tax: pricing.tax,
            subtotal: pricing.subtotal,
            shipping: pricing.shipping,
            discount: pricing.discount,
            total: pricing.total,
            couponCode: data.couponCode ? data.couponCode.trim().toUpperCase() : null,
            items: {
              create: pricing.orderItems.map((item) => ({
                variantId: item.variantId,
                productName: item.productName,
                size: item.size,
                color: item.color,
                sku: item.sku,
                price: item.price,
                quantity: item.quantity,
              })),
            },
            statusHistory: {
              create: {
                status: "PENDING",
                note: `Order placed via ${data.paymentMethod} (${pricing.currency} ${pricing.total})`,
              },
            },
          },
          include: {
            items: true,
            address: true,
          },
        });

        // Step F: Increment coupon usage if applied
        if (data.couponCode && data.couponCode.trim()) {
          await tx.coupon.updateMany({
            where: { code: data.couponCode.trim().toUpperCase() },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Step G: Clear logged-in user database cart
        if (userId) {
          const userCart = await tx.cart.findUnique({ where: { userId } });
          if (userCart) {
            await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
          }
        }

        return newOrder;
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );

    // Revalidate relevant cached routes
    try {
      revalidatePath("/");
      revalidatePath("/shop");
      revalidatePath("/products/[slug]", "page");
    } catch (e) {
      console.warn("[Checkout] Revalidation warning:", e);
    }

    // Dispatch transactional order confirmation email
    try {
      const { sendOrderConfirmationEmail } = await import("@/lib/services/email");
      await sendOrderConfirmationEmail(order.id);
    } catch (emailErr) {
      console.warn("[Checkout] Failed to dispatch order confirmation email:", emailErr);
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: any) {
    // 6. Handle Database-Level Idempotency deduplication (Prisma P2002)
    const isUniqueConstraintViolation =
      err?.code === "P2002" &&
      (err?.meta?.target?.includes("transactionId") ||
        String(err?.message || "").includes("transactionId") ||
        String(err?.message || "").includes("orders_transactionId_key"));

    if (isUniqueConstraintViolation) {
      const existingOrder = await prisma.order.findUnique({
        where: { transactionId: idempotencyKey },
        include: { items: true, address: true },
      });
      if (existingOrder) {
        return NextResponse.json(
          {
            order: existingOrder,
            deduplicated: true,
            message: "Existing order returned for idempotency key.",
          },
          { status: 200 }
        );
      }
    }

    // 7. Handle transaction timeout under high lock contention
    // If concurrent duplicates queue on the row/index lock and time out, retry lookup
    const isTimeoutOrContention =
      err?.code === "P2028" ||
      err?.code === "P2024" ||
      String(err?.message || "").toLowerCase().includes("timed out") ||
      String(err?.message || "").toLowerCase().includes("transaction already closed") ||
      String(err?.message || "").toLowerCase().includes("transaction was aborted");

    if (isTimeoutOrContention) {
      console.warn(
        `[Checkout Contention] Transaction timed out for key ${idempotencyKey}. Retrying lookup...`
      );
      const existingOrder = await prisma.order.findUnique({
        where: { transactionId: idempotencyKey },
        include: { items: true, address: true },
      });
      if (existingOrder) {
        return NextResponse.json(
          {
            order: existingOrder,
            deduplicated: true,
            message: "Order resolved following contention retry.",
          },
          { status: 200 }
        );
      }
    }

    // 8. Handle Out of Stock error
    if (
      err instanceof InsufficientStockError ||
      err?.name === "InsufficientStockError" ||
      err?.code === "OUT_OF_STOCK"
    ) {
      return NextResponse.json(
        {
          error: err.message,
          code: "OUT_OF_STOCK",
          variantId: err.variantId,
          requested: err.requested,
          available: err.available,
        },
        { status: 400 }
      );
    }

    // 9. Handle Pricing or Validation errors
    if (err instanceof PricingError || err?.name === "PricingError") {
      return NextResponse.json(
        { error: err.message, code: err.code || "PRICING_ERROR" },
        { status: 400 }
      );
    }

    // 10. Handle Database connection failures
    const errMsg = String(err?.message || err);
    if (
      errMsg.includes("fetch failed") ||
      errMsg.includes("NeonDbError") ||
      errMsg.includes("ECONNREFUSED") ||
      errMsg.includes("connection closed")
    ) {
      console.error("[Checkout Database Error]:", err);
      return NextResponse.json(
        {
          error: "Store database connection issue. Please retry in a moment.",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    // 11. Generic error fallback
    console.error("[Checkout Unhandled Error]:", err);
    return NextResponse.json(
      {
        error: err?.message || "Checkout could not be completed.",
        code: "CHECKOUT_FAILED",
      },
      { status: 400 }
    );
  }
}