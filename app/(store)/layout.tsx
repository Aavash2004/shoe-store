import { Suspense } from "react";
import { cookies } from "next/headers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toast } from "@/components/ui/Toast";
import type { SupportedCurrency } from "@/stores/currency-store";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const rawCurrency = cookieStore.get("shoe_currency")?.value;
  const initialCurrency =
    rawCurrency && ["USD", "NPR", "EUR", "GBP"].includes(rawCurrency)
      ? (rawCurrency as SupportedCurrency)
      : "USD";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-cream)]">
      <Suspense>
        <Header initialCurrency={initialCurrency} />
      </Suspense>
      <main className="flex-1">{children}</main>
    
      <Footer />
    </div>
  );
}