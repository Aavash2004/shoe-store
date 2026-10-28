import type { Metadata } from "next";
import { Urbanist, Caveat } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/layout/SessionProviderWrapper";
import { Toast } from "@/components/ui/Toast";
import { CartDrawer } from "@/components/cart/CartDrawer";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ABXV — Premium Footwear & Designer Sneakers",
    template: "%s | ABXV",
  },
  description:
    "ABXV — Premium sneakers, running shoes, and lifestyle footwear, thoughtfully crafted for comfort and bold performance.",
  keywords: [
    "shoes",
    "sneakers",
    "running shoes",
    "footwear",
    "ABXV",
    "lifestyle sneakers",
  ],
  openGraph: {
    title: "ABXV — Premium Footwear & Designer Sneakers",
    description:
      "Discover curated sneakers, athletic running shoes, and lifestyle footwear at ABXV.",
    siteName: "ABXV Footwear",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${urbanist.variable} ${caveat.variable}`}>
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