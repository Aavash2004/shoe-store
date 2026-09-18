import { NextRequest, NextResponse } from "next/server";
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
import {
    initiateKhaltiPayment,
    toKhaltiPaisa,
} from "@/lib/services/khalti";

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

    // 1. Idempotency Key validation
    const idempotencyKey =
        request.headers.get("idempotency-key")?.trim() ||
        request.headers.get("x-idempotency-key")?.trim() ||
        (typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "");

    if (!idempotencyKey) {
        return NextResponse.json(
            {
                error: "Missing required idempotency key.",
                code: "MISSING_IDEMPOTENCY_KEY",
            },
            { status: 400 }
        );
    }

    // 2. Validate input schema
    const parsed = checkoutSchema.safeParse({
        ...body,
        paymentMethod: "KHALTI",
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

    // 3. Nepal Allowlist check
    if (data.country !== "NP" || !isCountryEnabled(data.country)) {
        return NextResponse.json(
            {
                error: "Khalti is only available for orders shipping within Nepal.",
                code: "KHALTI_REGION_UNSUPPORTED",
            },
            { status: 400 }
        );
    }

    // 4. Session & Guest validation
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
        // 5. Calculate Server-Side Pricing (Guarantees NPR currency)
        const pricing = await calculateOrderPricing(
            data.items,
            data.country,
            data.couponCode
        );

        const amountInPaisa = toKhaltiPaisa(pricing.total);

        // Minimum Khalti amount: 10 NPR (1000 Paisa)
        if (amountInPaisa < 1000) {
            return NextResponse.json(
                {
                    error: "Minimum order amount for Khalti payment is Rs. 10.",
                    code: "AMOUNT_BELOW_MINIMUM",
                },
                { status: 400 }
            );
        }

        const orderNumber = generateOrderNumber();
        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            `${request.nextUrl.protocol}//${request.nextUrl.host}`;

        // 6. Database Transaction: Decrement stock & create order
        const order = await prisma.$transaction(
            async (tx) => {
                // Decrement stock with lock to prevent race conditions
                await decrementStockWithLock(tx, data.items);

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

                const newOrder = await tx.order.create({
                    data: {
                        orderNumber,
                        userId,
                        guestEmail: userId ? null : data.guestEmail,
                        guestName: userId ? null : data.guestName,
                        addressId: address.id,
                        paymentMethod: "KHALTI",
                        paymentStatus: "PENDING",
                        status: "PENDING",
                        transactionId: idempotencyKey,
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
                                note: `Khalti payment initiated (${pricing.currency} ${pricing.total})`,
                            },
                        },
                    },
                });

                if (data.couponCode?.trim()) {
                    await tx.coupon.updateMany({
                        where: { code: data.couponCode.trim().toUpperCase() },
                        data: { usedCount: { increment: 1 } },
                    });
                }

                if (userId) {
                    const userCart = await tx.cart.findUnique({ where: { userId } });
                    if (userCart) {
                        await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
                    }
                }

                return newOrder;
            },
            { maxWait: 5000, timeout: 10000 }
        );

        // 7. Initiate Khalti ePayment Session
        const khaltiSession = await initiateKhaltiPayment({
            returnUrl: `${appUrl}/api/checkout/khalti/callback`,
            websiteUrl: appUrl,
            amountInPaisa,
            purchaseOrderId: order.id,
            purchaseOrderName: `Order #${order.orderNumber}`,
            customerInfo: {
                name: data.fullName,
                email: data.guestEmail || session?.user?.email || "customer@shoestore.com",
                phone: data.phone,
            },
        });

        // 8. Associate Khalti pidx with Order
        await prisma.order.update({
            where: { id: order.id },
            data: { khaltiPidx: khaltiSession.pidx },
        });

        return NextResponse.json(
            {
                paymentUrl: khaltiSession.payment_url,
                pidx: khaltiSession.pidx,
                orderId: order.id,
                orderNumber: order.orderNumber,
            },
            { status: 201 }
        );
    } catch (err: any) {
        if (err instanceof InsufficientStockError || err instanceof PricingError) {
            return NextResponse.json(
                { error: err.message, code: err.code },
                { status: 400 }
            );
        }

        console.error("[Khalti Checkout Initiate Error]:", err);
        return NextResponse.json(
            { error: err.message || "Failed to initialize Khalti checkout." },
            { status: 500 }
        );
    }
}
