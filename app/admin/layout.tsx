import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { AdminNav } from "@/components/admin/AdminNav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-cream">
      <AdminNav email={session.user.email ?? ""} />
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
      <footer className="border-t border-sand py-6 text-center text-xs text-navy/50">
        © {new Date().getFullYear()} Shoe Store. All rights reserved.
      </footer>
    </div>
  );
}