import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure Checkout",
  description: "Complete your footwear purchase with end-to-end encrypted checkout via Stripe, Khalti, or Cash on Delivery at ABXV.",
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
