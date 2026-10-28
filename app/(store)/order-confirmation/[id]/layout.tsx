import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Confirmation",
  description: "View your ABXV footwear purchase summary, invoice details, and shipment status.",
};

export default function OrderConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
