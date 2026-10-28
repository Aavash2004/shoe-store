import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Enter your new ABXV account password.",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
