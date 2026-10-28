import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile & Settings",
  description: "Update your personal information, manage delivery addresses, and change your password at ABXV.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
