import type { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { isAdminSession, evaluateAdminRouteAccess } from "@/lib/auth/authorization";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: {
    default: "Admin Portal",
    template: "%s | ABXV Admin",
  },
  description: "ABXV Store Management and Administration Portal.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isAllowedAdminLogin = headersList.get("x-admin-login-allowed") === "true";

  const session = await auth();
  const isAdmin = isAdminSession(session);
  const isLoggedIn = !!session?.user;

  const decision = evaluateAdminRouteAccess({
    pathname: isAllowedAdminLogin ? (process.env.ADMIN_LOGIN_PATH || "/admin/login") : pathname,
    isLoggedIn,
    isAdmin,
    adminLoginPath: process.env.ADMIN_LOGIN_PATH || "/admin/login",
  });

  if (decision.action === "404") {
    notFound();
  }

  if (decision.action === "redirect") {
    redirect(decision.target as any);
  }

  // /admin/login is served without sidebar
  if (pathname === "/admin/login" || isAllowedAdminLogin) {
    return <>{children}</>;
  }

  return (
    <div className="admin-portal min-h-screen bg-[var(--color-cream)]">
      <AdminSidebar
        user={{
          name: session?.user?.name ?? null,
          email: session?.user?.email ?? null,
        }}
      />
      <div className="flex flex-col lg:pl-64 min-h-screen transition-all duration-200">
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-[var(--color-sand)] py-6 text-center text-sm text-[var(--color-navy)]/45">
          © {new Date().getFullYear()} ABXV Footwear Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}