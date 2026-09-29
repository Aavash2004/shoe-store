import { auth } from "@/lib/auth/auth";
import { isAdminSession } from "@/lib/auth/authorization";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect, notFound } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = isAdminSession(session);

  // Unauthenticated requests must return 404 to conceal the admin area
  if (!session?.user) {
    notFound();
  }

  // Authenticated non-admins must be blocked
  if (!isAdmin) {
    redirect("/?error=AccessDenied");
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      <AdminSidebar
        user={{
          name: session.user?.name ?? null,
          email: session.user?.email ?? null,
        }}
      />
      <div className="flex flex-col lg:pl-64 min-h-screen transition-all duration-200">
        <main className="flex-1 mx-auto w-full max-w-7xl px-3.5 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-[var(--color-sand)] py-6 text-center text-xs text-[var(--color-navy)]/45">
          © {new Date().getFullYear()} ABXV Footwear Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}