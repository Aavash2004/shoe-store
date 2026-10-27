import { redirect } from "next/navigation";
import { stripe, confirmStripePayment } from "@/lib/services/stripe";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; orderId?: string; orderNumber?: string; payment_intent?: string }>;
}) {
  const { order, orderId, payment_intent } = await searchParams;
  const targetId = orderId || order;

  // Verify PaymentIntent server-side with Stripe if present and confirm order idempotently
  if (payment_intent && targetId) {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const orderRecord = await prisma.order.findUnique({
        where: { id: targetId },
        select: { id: true, stripePaymentIntentId: true },
      });

      // Confirm ONLY when the order's stored PaymentIntent id matches the retrieved one
      if (orderRecord && orderRecord.stripePaymentIntentId === payment_intent) {
        const intent = await stripe.paymentIntents.retrieve(payment_intent);
        if (intent.status === "succeeded") {
          await confirmStripePayment(orderRecord.id, {
            paymentIntentId: payment_intent,
            amount: intent.amount,
            currency: intent.currency,
            source: "checkout_success",
          });
        }
      } else {
        console.warn(
          `[Checkout Success] Mismatch or missing order: order ${targetId} stored PI "${orderRecord?.stripePaymentIntentId}" does not match provided "${payment_intent}". Confirmation skipped.`
        );
      }
    } catch (err) {
      console.warn("[Checkout Success] PaymentIntent verification error:", err);
    }
  }

  if (targetId) {
    redirect(`/order-confirmation/${targetId}`);
  }

  redirect("/shop");
}
