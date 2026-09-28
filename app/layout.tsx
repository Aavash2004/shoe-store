import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/layout/SessionProviderWrapper";
import { Toast } from "@/components/ui/Toast";
import { CartDrawer } from "@/components/cart/CartDrawer";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
});

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
    <html lang="en" className={urbanist.variable}>
      <body className={`${urbanist.className} antialiased`}>
        <SessionProviderWrapper>
          {children}
          <Toast />
          <CartDrawer />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}