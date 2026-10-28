import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wishlist",
  description: "View your saved sneakers and favorite shoes at ABXV.",
};

export default function WishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
