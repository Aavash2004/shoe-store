import { auth } from "@/lib/auth/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  // If rendering without an active admin session (e.g. on /admin/login page),
  // return plain children without the AdminNav header chrome.
  // Protection of /admin sub-routes is enforced by middleware.ts & page-level checks.
  if (!isAdmin) {
    return <>{children}</>;
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