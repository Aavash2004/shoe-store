import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders",
  description: "View and track all your previous and active shoe orders placed with ABXV.",
};

export default function AccountOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
