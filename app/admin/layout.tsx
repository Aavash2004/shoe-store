import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { ShieldAlert, Store } from "lucide-react";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // If rendering admin login page, bypass admin layout chrome & checks
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Server-side authorization check
  const session = await auth();

  if (!session || !session.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] flex flex-col justify-center items-center p-6 text-[var(--color-navy)]">
        <div className="max-w-md w-full bg-[var(--color-cream-alt)] border border-[var(--color-sand)] rounded-xl p-8 text-center space-y-6">
          <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-navy)]">
              403 - Access Denied
            </h1>
            <p className="text-xs text-[var(--color-navy)]/70">
              Authenticated user <span className="font-semibold text-[var(--color-navy)]">{session.user.email}</span> does not have administrator privileges.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-4 py-2.5 bg-[var(--color-navy)] hover:bg-[var(--color-navy)]/90 text-[var(--color-cream)] rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Store className="w-4 h-4" />
              <span>Return to Storefront</span>
            </Link>
            <div className="w-full sm:w-auto">
              <AdminLogoutButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navLinks = [
    { href: "/admin", label: "Dashboard", exact: true },
    { href: "/admin/products", label: "Products", exact: false },
    { href: "/admin/categories", label: "Categories", exact: false },
    { href: "/admin/inventory", label: "Inventory", exact: false },
    { href: "/admin/orders", label: "Orders", exact: false },
    { href: "/admin/users", label: "Users", exact: false },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-navy)] flex flex-col font-[family-name:var(--font-body)]">
      {/* Editorial Header */}
      <header className="border-b border-[var(--color-sand)] bg-[var(--color-cream)]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left Logo + Subtle Administration Label */}
          <div className="flex items-baseline gap-3">
            <Link
              href="/admin"
              className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-navy)] transition-opacity hover:opacity-80"
            >
              Shoe Store
            </Link>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-navy)]/55">
              Administration
            </span>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Admin Navigation">
            {navLinks.map((link) => {
              const active = link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs uppercase tracking-wider py-2 transition-all relative ${
                    active
                      ? "text-[var(--color-navy)] font-bold border-b-2 border-[var(--color-navy)]"
                      : "text-[var(--color-navy)]/65 font-medium hover:text-[var(--color-navy)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Admin Profile & Sign Out */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[var(--color-navy)]/70 hidden sm:inline-block font-mono">
              {session.user.email}
            </span>
            <span className="text-[var(--color-sand)] hidden sm:inline">|</span>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
