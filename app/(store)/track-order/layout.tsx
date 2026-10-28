import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Track your shoe shipment, estimated delivery dates, carrier updates, and live package status at ABXV.",
};

export default function TrackOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
