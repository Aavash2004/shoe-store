import { auth } from "@/lib/auth/auth";
import { UserRole } from "@/lib/generated/prisma/client";

export async function getSession() {
  return await auth();
}

/**
 * Ensures user is authenticated. Throws an Error if not authenticated.
 * Used in server-side functions / server components.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export function isAdminSession(
  session: { user?: { role?: string; email?: string | null } } | null | undefined
): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = session.user.email?.trim().toLowerCase();

  if (!role || (role !== "ADMIN" && role !== UserRole.ADMIN)) {
    return false;
  }

  if (!configuredAdminEmail || !userEmail || userEmail !== configuredAdminEmail) {
    return false;
  }

  return true;
}

/**
 * Ensures user is authenticated AND has ADMIN role AND matches process.env.ADMIN_EMAIL.
 * Fail-closed: Throws an Error if unauthorized or forbidden or if ADMIN_EMAIL is not configured.
 * Used in server-side functions / server components.
 */
export async function requireAdmin() {
  const session = await requireAuth();

  if (!isAdminSession(session)) {
    throw new Error("Forbidden: Admin access required");
  }

  return session;
}

/**
 * Ensures user is authenticated AND has CUSTOMER role (not ADMIN).
 * Throws an Error if unauthorized or forbidden.
 * Used in server-side functions / server components.
 */
export async function requireCustomer() {
  const session = await requireAuth();

  if (isAdminSession(session)) {
    throw new Error("Forbidden: Customers only");
  }

  return session;
}

/**
 * Specialized helper for API route handlers.
 * Returns an object with status code and error message if unauthorized/forbidden,
 * or the session if authorized.
 */
export async function requireAdminApi() {
  const session = await auth();
  if (!session || !session.user) {
    return {
      authorized: false as const,
      status: 401,
      error: "Unauthorized",
      session: null,
    };
  }

  if (!isAdminSession(session)) {
    return {
      authorized: false as const,
      status: 403,
      error: "Forbidden: Admin access required",
      session: null,
    };
  }

  return {
    authorized: true as const,
    status: 200,
    error: null,
    session,
  };
}
