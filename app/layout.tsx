import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/layout/SessionProviderWrapper";
import { Toast } from "@/components/ui/Toast";


const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Shoe Store",
  description: "Premium shoes, thoughtfully made.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        <SessionProviderWrapper>{children}<Toast></Toast></SessionProviderWrapper>
      </body>
    </html>
  );
}