import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // If rendering admin login page, bypass admin layout checks and nav chrome
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <AdminNav email={session.user.email ?? ""} />
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
      <footer className="border-t border-[var(--color-sand)] py-6 text-center text-xs text-[var(--color-navy)]/50">
        © {new Date().getFullYear()} ABXV. All rights reserved.
      </footer>
    </div>
  );
}