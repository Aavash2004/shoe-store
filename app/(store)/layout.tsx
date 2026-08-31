import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toast } from "@/components/ui/Toast";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-cream)]">
      <Suspense>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
    
      <Footer />
    </div>
  );
}