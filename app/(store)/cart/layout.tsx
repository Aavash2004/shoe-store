import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: "Review your selected footwear, update quantities, apply coupon codes, and proceed to secure checkout at ABXV.",
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
