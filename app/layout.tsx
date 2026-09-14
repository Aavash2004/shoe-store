import type { Metadata } from "next";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/layout/SessionProviderWrapper";
import { Toast } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "ABXV",
  description: "ABXV — Premium shoes, thoughtfully made.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProviderWrapper>{children}<Toast></Toast></SessionProviderWrapper>
      </body>
    </html>
  );
}