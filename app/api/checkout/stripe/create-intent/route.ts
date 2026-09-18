import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { checkoutSchema } from "@/lib/validations/checkout";
import { isCountryEnabled } from "@/lib/constants/countries";
import { CURRENCIES } from "@/lib/constants/currencies";
import {
  calculateOrderPricing,
  PricingError,
} from "@/lib/checkout/pricing";
import {
  decrementStockWithLock,
  InsufficientStockError,
} from "@/lib/checkout/stock";
import {
  stripe,
  toStripeSmallestUnit,
  validateStripeChargeMinimum,
} from "@/lib/services/stripe";

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

  // 2. Validate input schema (forced paymentMethod to STRIPE)
  const parsed = checkoutSchema.safeParse({
    ...body,
    paymentMethod: "STRIPE",
    idempotencyKey,
  });

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

  // 3. Destination country allowlist and currency check
  if (!isCountryEnabled(data.country)) {
    return NextResponse.json(
      {
        error: `Shipping is not currently available for country code: ${data.country}`,
        code: "COUNTRY_DISABLED",
      },
      { status: 400 }
    );
  }

  // Check if an order with this idempotency key already exists (Quick-path deduplication)
  const preExistingOrder = await prisma.order.findUnique({
    where: { transactionId: idempotencyKey },
    include: { items: true },
  });

  if (preExistingOrder && preExistingOrder.stripePaymentIntentId) {
    try {
      const existingIntent = await stripe.paymentIntents.retrieve(
        preExistingOrder.stripePaymentIntentId
      );
      return NextResponse.json(
        {
          clientSecret: existingIntent.client_secret,
          orderId: preExistingOrder.id,
          orderNumber: preExistingOrder.orderNumber,
          amount: Number(preExistingOrder.total),
          currency: preExistingOrder.currency,
          deduplicated: true,
        },
        { status: 200 }
      );
    } catch (stripeErr: any) {
      console.warn("[Stripe] Failed to retrieve existing payment intent:", stripeErr);
    }
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
    // 5. Calculate server-side pricing
    const pricing = await calculateOrderPricing(
      data.items,
      data.country,
      data.couponCode
    );

    const currencyConfig = CURRENCIES[pricing.currency.toUpperCase()];
    if (!currencyConfig?.isStripeChargeable) {
      return NextResponse.json(
        {
          error: `Currency ${pricing.currency} does not support online card processing. Please select Cash on Delivery.`,
          code: "CURRENCY_NOT_STRIPE_CHARGEABLE",
        },
        { status: 400 }
      );
    }

    // 6. Enforce Stripe Minimum Charge Floor
    const floorCheck = validateStripeChargeMinimum(
      pricing.total,
      pricing.currency
    );
    if (!floorCheck.isValid) {
      return NextResponse.json(
        {
          error: `Order total (${pricing.currency} ${pricing.total}) is below the Stripe minimum required amount of ${pricing.currency} ${floorCheck.minimum}.`,
          code: "AMOUNT_BELOW_MINIMUM",
        },
        { status: 400 }
      );
    }

    const amountInSmallestUnit = toStripeSmallestUnit(
      pricing.total,
      pricing.currency
    );

    // 7. Create Stripe PaymentIntent with Stripe-level idempotency key
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInSmallestUnit,
        currency: pricing.currency.toLowerCase(),
        payment_method_types: ["card"],
        metadata: {
          idempotencyKey,
          guestEmail: data.guestEmail || "",
          country: data.country,
          orderSubtotal: pricing.subtotal.toString(),
          orderShipping: pricing.shipping.toString(),
          orderTotal: pricing.total.toString(),
        },
      },
      {
        idempotencyKey: `pi_${idempotencyKey}`,
      }
    );

    // 8. Interactive database transaction with DB-level unique constraint
    const order = await prisma.$transaction(
      async (tx) => {
        // Step A: Deadlock-safe stock decrement
        await decrementStockWithLock(tx, data.items);

        // Step B: Create shipping address
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

        // Step C: Create Order with transactionId and stripePaymentIntentId
        const newOrder = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId,
            guestEmail: userId ? null : data.guestEmail,
            guestName: userId ? null : data.guestName,
            addressId: address.id,
            paymentMethod: "STRIPE",
            paymentStatus: "PENDING",
            status: "PENDING",
            transactionId: idempotencyKey,
            stripePaymentIntentId: paymentIntent.id,
            currency: pricing.currency,
            exchangeRate: pricing.exchangeRate,
            tax: pricing.tax,
            subtotal: pricing.subtotal,
            shipping: pricing.shipping,
            total: pricing.total,
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
                note: `PaymentIntent initialized (${pricing.currency} ${pricing.total}, PI: ${paymentIntent.id})`,
              },
            },
          },
          include: {
            items: true,
            address: true,
          },
        });

        // Step D: Increment coupon usage if applied
        if (data.couponCode && data.couponCode.trim()) {
          await tx.coupon.updateMany({
            where: { code: data.couponCode.trim().toUpperCase() },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Step E: Clear authenticated user cart
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

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: Number(order.total),
        currency: order.currency,
        deduplicated: false,
      },
      { status: 201 }
    );
  } catch (err: any) {
    // Check for Prisma unique constraint violation (P2002) on transactionId
    const isUniqueConstraintViolation =
      err?.code === "P2002" &&
      (err?.meta?.target?.includes("transactionId") ||
        String(err?.message || "").includes("transactionId") ||
        String(err?.message || "").includes("orders_transactionId_key"));

    if (isUniqueConstraintViolation) {
      const existingOrder = await prisma.order.findUnique({
        where: { transactionId: idempotencyKey },
      });
      if (existingOrder?.stripePaymentIntentId) {
        try {
          const existingIntent = await stripe.paymentIntents.retrieve(
            existingOrder.stripePaymentIntentId
          );
          return NextResponse.json(
            {
              clientSecret: existingIntent.client_secret,
              orderId: existingOrder.id,
              orderNumber: existingOrder.orderNumber,
              amount: Number(existingOrder.total),
              currency: existingOrder.currency,
              deduplicated: true,
            },
            { status: 200 }
          );
        } catch (retrieveErr) {
          console.error("[Stripe] Failed to retrieve existing PI:", retrieveErr);
        }
      }
    }

    // Handle Lock Contention Timeout (P2028 or transaction timeout)
    const isLockContentionTimeout =
      err?.code === "P2028" ||
      err?.code === "P2024" ||
      String(err?.message || "").includes("Transaction already closed") ||
      String(err?.message || "").includes("timed out");

    if (isLockContentionTimeout) {
      const winnerOrder = await prisma.order.findUnique({
        where: { transactionId: idempotencyKey },
      });
      if (winnerOrder?.stripePaymentIntentId) {
        try {
          const winnerIntent = await stripe.paymentIntents.retrieve(
            winnerOrder.stripePaymentIntentId
          );
          return NextResponse.json(
            {
              clientSecret: winnerIntent.client_secret,
              orderId: winnerOrder.id,
              orderNumber: winnerOrder.orderNumber,
              amount: Number(winnerOrder.total),
              currency: winnerOrder.currency,
              deduplicated: true,
            },
            { status: 200 }
          );
        } catch (retrieveErr) {
          console.error("[Stripe] Failed to retrieve winner PI:", retrieveErr);
        }
      }
    }

    // Handle Out-Of-Stock Error cleanly as 400 Bad Request
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          variantId: err.variantId,
          requested: err.requested,
          available: err.available,
        },
        { status: 400 }
      );
    }

    // Handle Pricing Error cleanly as 400 Bad Request
    if (err instanceof PricingError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
        },
        { status: 400 }
      );
    }

    console.error("[Stripe Create Intent Error]:", err);
    return NextResponse.json(
      {
        error: "Failed to initialize payment intent. Please try again.",
        details: process.env.NODE_ENV === "development" ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
