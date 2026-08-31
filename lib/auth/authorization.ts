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

/**
 * Ensures user is authenticated AND has ADMIN role AND matches process.env.ADMIN_EMAIL.
 * Throws an Error if unauthorized or forbidden.
 * Used in server-side functions / server components.
 */
export async function requireAdmin() {
  const session = await requireAuth();
  const role = session.user.role as string;
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (role !== "ADMIN" && role !== UserRole.ADMIN) {
    throw new Error("Forbidden: Admin role required");
  }

  if (configuredAdminEmail && session.user.email?.toLowerCase() !== configuredAdminEmail) {
    throw new Error("Forbidden: Unauthorized admin account");
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
  const role = session.user.role as string;
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (role === "ADMIN" || role === UserRole.ADMIN) {
    throw new Error("Forbidden: Customers only");
  }

  if (configuredAdminEmail && session.user.email?.toLowerCase() === configuredAdminEmail) {
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

  const role = session.user.role as string;
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (role !== "ADMIN" && role !== UserRole.ADMIN) {
    return {
      authorized: false as const,
      status: 403,
      error: "Forbidden: Admin access required",
      session: null,
    };
  }

  if (configuredAdminEmail && session.user.email?.toLowerCase() !== configuredAdminEmail) {
    return {
      authorized: false as const,
      status: 403,
      error: "Forbidden: Unauthorized admin account",
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
