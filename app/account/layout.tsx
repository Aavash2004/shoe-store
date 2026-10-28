import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountNav } from "@/components/account/AccountNav";
import { Toast } from "@/components/ui/Toast";  
import type { SupportedCurrency } from "@/stores/currency-store";

export const metadata: Metadata = {
  title: "My Account",
  description:
    "Manage your ABXV profile, delivery addresses, order history, and saved wishlist items.",
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([
    auth(),
    cookies(),
  ]);
  const rawCurrency = cookieStore.get("shoe_currency")?.value;
  const initialCurrency =
    rawCurrency && ["USD", "NPR", "EUR", "GBP"].includes(rawCurrency)
      ? (rawCurrency as SupportedCurrency)
      : "USD";

  const isAdmin = session?.user?.role === "ADMIN";
  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-cream)]">
      <Header initialCurrency={initialCurrency} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {isLoggedIn && !isAdmin ? (
          <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
            <AccountNav />
            <section className="flex-1 min-w-0">{children}</section>
          </div>
        ) : (
          <section className="w-full">{children}</section>
        )}
      </main>
      <Footer />
    </div>
  );
}
