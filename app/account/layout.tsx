import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountNav } from "@/components/account/AccountNav";
import { Toast } from "@/components/ui/Toast";  


export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/account");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-cream)]">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          <AccountNav />
          <section className="flex-1 min-w-0">{children}</section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
