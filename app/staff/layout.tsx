import type { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { isStaffSession, isAdminSession } from "@/lib/auth/authorization";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { StaffSidebar } from "@/components/staff/StaffSidebar";

export const metadata: Metadata = {
  title: {
    default: "Staff Portal",
    template: "%s | ABXV Staff",
  },
  description: "ABXV Store Staff Portal — Fulfillment & Inventory.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  // Staff login page renders without the layout shell
  if (pathname === "/staff/login") {
    return <>{children}</>;
  }

  const session = await auth();

  // Not logged in — 404 (middleware should have caught this, but defense-in-depth)
  if (!session?.user) {
    redirect("/staff/login" as any);
  }

  const isStaff = isStaffSession(session);
  const isAdmin = isAdminSession(session);

  // Only STAFF and ADMIN can access the staff portal
  if (!isStaff && !isAdmin) {
    redirect("/staff/login" as any);
  }

  // For STAFF users: verify against DB (role, isActive, passwordChangedAt, session age)
  if (isStaff) {
    const userId = (session.user as any).id;
    const tokenAuthAt =
      (session as any).authAt ??
      (session.user as any)?.authAt ??
      (session as any).iat ??
      (session.user as any)?.iat;

    if (!userId || typeof tokenAuthAt !== "number") {
      redirect("/staff/login" as any);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: true,
      },
    });

    // User deleted or role changed — kill session
    if (!dbUser || (dbUser.role as string) !== "STAFF") {
      redirect("/staff/login" as any);
    }

    // Account deactivated
    if (!dbUser.isActive) {
      redirect("/staff/login" as any);
    }

    // Enforce hard cap session age (10 hours) from login timestamp
    const sessionAgeS = Math.floor(Date.now() / 1000) - tokenAuthAt;
    if (sessionAgeS > 10 * 60 * 60) {
      redirect("/staff/login" as any);
    }

    // Password was changed after or during authentication (code regeneration)
    if (dbUser.passwordChangedAt) {
      const changedAtS = Math.floor(dbUser.passwordChangedAt.getTime() / 1000);
      if (changedAtS >= tokenAuthAt) {
        redirect("/staff/login" as any);
      }
    }

    // Must change password — redirect to change-password page (only exception)
    if (dbUser.mustChangePassword && pathname !== "/staff/change-password") {
      redirect("/staff/change-password" as any);
    }
  }

  return (
    <div className="staff-portal min-h-screen bg-[var(--color-cream)]">
      <StaffSidebar
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          isAdmin,
        }}
      />
      <div className="flex flex-col lg:pl-64 min-h-screen transition-all duration-200">
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-[var(--color-sand)] py-4 text-center text-sm text-[var(--color-navy)]/45">
          © {new Date().getFullYear()} ABXV Footwear — Staff Portal
        </footer>
      </div>
    </div>
  );
}
