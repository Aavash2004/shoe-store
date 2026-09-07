import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { checkoutSchema } from "@/lib/validations/checkout";
import { initiateKhaltiPayment } from "@/lib/services/khalti";

function generateOrderNumber() {
  const random = Math.floor(10000 + Math.random() * 90000);
  return `SH-${random}`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const userId = session?.user ? (session.user as any).id : null;

  if (!userId) {
    if (!data.guestName && data.fullName) {
      data.guestName = data.fullName;
    }
    if (!data.guestEmail || !data.guestName) {
      return NextResponse.json({ error: "Guest checkout requires an email address." }, { status: 400 });
    }
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Fetch variants with current stock
      const variantIds = data.items.map((i) => i.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds }, isActive: true },
        include: { product: true },
      });

      // Validate stock for every item BEFORE writing anything
      for (const item of data.items) {
        const variant = variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new Error("One or more items in your cart are no longer available.");
        }
        if (variant.stock < item.quantity) {
          if (variant.stock === 0) {
            throw new Error(`${variant.product.name} is currently out of stock.`);
          }
          throw new Error(
            `Only ${variant.stock} item${variant.stock > 1 ? "s" : ""} left in stock.`
          );
        }
      }

      // Decrement stock per item atomically inside transaction
      for (const item of data.items) {
        const result = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new Error("Stock changed during checkout, please try again.");
        }
      }

      // Calculate totals from server-side variant prices (never trust client price)
      const orderItemsData = data.items.map((item) => {
        const variant = variants.find((v) => v.id === item.variantId)!;
        return {
          variantId: variant.id,
          productName: variant.product.name,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          price: variant.price,
          quantity: item.quantity,
        };
      });

      const subtotal = orderItemsData.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      );
      const shipping = subtotal > 150 ? 0 : 9.99;
      const total = subtotal + shipping;

      // Create address
      const address = await tx.address.create({
        data: {
          userId,
          fullName: data.fullName,
          phone: data.phone,
          line1: data.line1,
          line2: data.line2,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode || "N/A",
          country: data.country,
        },
      });

      // Create order + items + initial status history
      const newOrder = await (tx.order.create as any)({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          guestEmail: userId ? null : data.guestEmail,
          guestName: userId ? null : data.guestName,
          addressId: address.id,
          paymentMethod: data.paymentMethod || "COD",
          subtotal,
          shipping,
          total,
          items: { create: orderItemsData },
          statusHistory: {
            create: {
              status: "PENDING",
              note: `Order placed via ${data.paymentMethod || "COD"}`,
            },
          },
        },
      });

      // Clear DB cart if logged in
      if (userId) {
        const cart = await tx.cart.findUnique({ where: { userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
      }

      return newOrder;
    });

    // Handle Khalti Payment Initiation if paymentMethod === "KHALTI"
    let paymentUrl: string | undefined = undefined;
    let pidx: string | undefined = undefined;

    if (data.paymentMethod === "KHALTI") {
      try {
        const host = request.headers.get("host") || "localhost:3001";
        const protocol = host.includes("localhost") ? "http" : "https";
        const returnUrl = `${protocol}://${host}/api/webhooks/khalti`;

        const khaltiResponse = await initiateKhaltiPayment({
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalNpr: Number(order.total),
          customerName: data.fullName,
          customerEmail: data.guestEmail || (session?.user?.email as string) || "customer@example.com",
          customerPhone: data.phone,
          returnUrl,
          websiteUrl: `${protocol}://${host}`,
        });

        paymentUrl = khaltiResponse.payment_url;
        pidx = khaltiResponse.pidx;

        // Save pidx transactionId on order
        await (prisma.order.update as any)({
          where: { id: order.id },
          data: { transactionId: pidx },
        });
      } catch (khaltiErr: any) {
        console.error("[Checkout Khalti Initiate Error]:", khaltiErr);
        // Fallback: order stays created as PENDING
      }
    }

    try {
      revalidatePath("/");
      revalidatePath("/shop");
      revalidatePath("/products/[slug]", "page");
    } catch (e) {
      console.warn("[Checkout] Revalidation warning:", e);
    }

    return NextResponse.json({ order, paymentUrl, pidx }, { status: 201 });
  } catch (err: any) {
    console.error("[Checkout Route Error]:", err);
    const errMsg = String(err?.message || err);
    if (
      errMsg.includes("fetch failed") ||
      errMsg.includes("NeonDbError") ||
      errMsg.includes("PrismaClient") ||
      errMsg.includes("ECONNREFUSED")
    ) {
      return NextResponse.json(
        { error: "Unable to connect to the store right now. Please try again." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: err.message ?? "Checkout failed" }, { status: 400 });
  }
}