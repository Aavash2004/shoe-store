import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create an account with ABXV to enjoy faster checkout, exclusive drops, and order tracking.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
