import { auth } from "@/lib/auth/auth";
import { isAdminSession } from "@/lib/auth/authorization";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  const session = await auth();
  const isAdmin = isAdminSession(session);

  // /admin/login is the public route under /admin
  if (pathname === "/admin/login") {
    if (isAdmin) {
      redirect("/admin");
    }
    return <>{children}</>;
  }

  // Unauthenticated guests must go to /admin/login
  if (!session?.user) {
    redirect("/admin/login");
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