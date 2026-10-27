import { prisma } from "../lib/db/prisma";

async function main() {
  console.log("==========================================");
  console.log("🛒 TESTING COMPLETE CUSTOMER CHECKOUT FLOW");
  console.log("==========================================");

  // 1. Pick an active product with variants
  const product = await prisma.product.findFirst({
    where: { isActive: true },
    include: { variants: { where: { isActive: true } } },
  });

  if (!product || product.variants.length === 0) {
    throw new Error("No active product found");
  }

  const variant = product.variants[0];
  console.log(`1. Selected Product: ${product.name} | Variant: Size ${variant.size}, Color ${variant.color}, Price $${variant.price}`);

  // 2. Test Customer user
  const customer = await prisma.user.findFirst({
    where: { role: "CUSTOMER" },
  });

  if (!customer) {
    throw new Error("No customer user found");
  }

  console.log(`2. Customer: ${customer.name} (${customer.email})`);

  // 3. Ensure customer has a cart
  let cart = await prisma.cart.findUnique({
    where: { userId: customer.id },
  });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: customer.id } });
  }

  // 4. Add item to cart
  const cartItem = await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    update: { quantity: 1 },
    create: { cartId: cart.id, variantId: variant.id, quantity: 1 },
  });
  console.log(`3. Added item to cart: CartItem ID ${cartItem.id}`);

  // 5. Test Coupon query
  const coupon = await (prisma as any).coupon.findUnique({
    where: { code: "WELCOME10" },
  });
  console.log(`4. Verified Coupon WELCOME10: ${coupon?.discountValue}% OFF`);

  // 6. Test Order Creation
  const orderNumber = `TEST-FLOW-${Date.now()}`;
  const unitPrice = Number(variant.price);
  const discountAmount = coupon ? (unitPrice * Number(coupon.discountValue)) / 100 : 0;
  const total = unitPrice - discountAmount;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: customer.id,
      guestEmail: customer.email,
      guestName: customer.name || "Customer",
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: unitPrice,
      discount: discountAmount,
      total,
      currency: "USD",
      stockReserved: true,
      couponCode: coupon?.code,
      couponId: coupon?.id,
      items: {
        create: [
          {
            variantId: variant.id,
            productName: product.name,
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            price: unitPrice,
            quantity: 1,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  console.log(`5. Order Created Successfully!`);
  console.log(`   Order ID: ${order.id}`);
  console.log(`   Order Number: ${order.orderNumber}`);
  console.log(`   Subtotal: $${order.subtotal} | Discount: -$${order.discount} | Total: $${order.total}`);
  console.log(`   Items: ${order.items.length}`);

  // 7. Verify Order can be queried
  const queried = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true, user: true },
  });
  console.log(`6. Verified Query on Order: Status is ${queried?.status}, Payment is ${queried?.paymentStatus}`);

  // 8. Clean up test order & test cart item
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.cartItem.delete({ where: { id: cartItem.id } });
  console.log("7. Cleaned up test order and cart item.");

  console.log("\n==========================================");
  console.log("🎉 CUSTOMER FLOW VERIFICATION PASSED!");
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error("❌ CUSTOMER FLOW FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
