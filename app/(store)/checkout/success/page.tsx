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
  if (targetId) {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const orderRecord = await prisma.order.findUnique({
        where: { id: targetId },
        select: { id: true, stripePaymentIntentId: true, paymentStatus: true },
      });

      const piToVerify = payment_intent || orderRecord?.stripePaymentIntentId;

      // Confirm when stored or provided PaymentIntent is present and order is not already paid
      if (
        orderRecord &&
        orderRecord.paymentStatus !== "PAID" &&
        piToVerify &&
        (!payment_intent || orderRecord.stripePaymentIntentId === payment_intent)
      ) {
        const intent = await stripe.paymentIntents.retrieve(piToVerify);
        if (intent.status === "succeeded") {
          await confirmStripePayment(orderRecord.id, {
            paymentIntentId: piToVerify,
            amount: intent.amount,
            currency: intent.currency,
            source: "checkout_success",
          });
        }
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
