import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl text-navy">
        Order Confirmed
      </h1>
      <p className="mt-4 text-navy/70">
        Thank you! Your order {order && <strong>{order}</strong>} has been placed.
      </p>
      <Button className="mt-8" asChild>
        <Link href="/shop">Continue Shopping</Link>
      </Button>
    </div>
  );
}