import { redirect } from "next/navigation";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; orderId?: string; orderNumber?: string }>;
}) {
  const { order, orderId } = await searchParams;
  const targetId = orderId || order;

  if (targetId) {
    redirect(`/order-confirmation/${targetId}`);
  }

  redirect("/shop");
}

