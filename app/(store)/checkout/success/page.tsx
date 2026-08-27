import Link from "next/link";
import { CircleCheck, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyOrderId } from "@/components/checkout/CopyOrderId";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CircleCheck className="h-10 w-10 text-green-600" />
      </div>

      <h1 className="mt-8 font-[family-name:var(--font-display)] text-4xl text-navy">
        Order Confirmed
      </h1>
      <p className="mt-4 text-navy/70">
        Thank you for your purchase! We&apos;ve sent a confirmation email with
        your order details.
      </p>

      {order ? (
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-navy/10 bg-cream p-6 text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-navy/60">
            Order ID
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-lg font-semibold text-navy">
              {order}
            </span>
            <CopyOrderId orderId={order} />
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
        <div className="rounded-xl border border-navy/10 bg-white p-4">
          <Package className="h-5 w-5 text-navy" />
          <p className="mt-2 text-sm font-semibold text-navy">
            Order Processing
          </p>
          <p className="mt-1 text-xs text-navy/60">
            Your order is being processed and will be shipped within 1–2 business
            days.
          </p>
        </div>
        <div className="rounded-xl border border-navy/10 bg-white p-4">
          <Truck className="h-5 w-5 text-navy" />
          <p className="mt-2 text-sm font-semibold text-navy">
            Shipping Status
          </p>
          <p className="mt-1 text-xs text-navy/60">
            Track your order anytime from your account dashboard.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button asChild className="rounded-full">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
        <Button variant="outline" asChild className="rounded-full">
          <Link href="/track-order">Track Order</Link>
        </Button>
      </div>
    </div>
  );
}
