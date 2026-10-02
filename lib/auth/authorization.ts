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
 * Sanitizes a callbackUrl to prevent open redirects and unauthorized routing:
 * 1. Must be a relative path starting with a single '/'
 * 2. Rejects '//' (protocol-relative) and '/\' (Windows path / URL bypass)
 * 3. Rejects any path containing backslashes
 * 4. Rejects absolute schemes (e.g. https://, http://, javascript:)
 * 5. For customers (allowAdmin !== true), rejects paths starting with /admin
 * 6. Falls back to fallback (default: "/account") on any invalid or missing value.
 */
export function sanitizeCallbackUrl(
  callbackUrl: string | null | undefined,
  options?: { allowAdmin?: boolean; fallback?: string }
): string {
  const fallback = options?.fallback ?? "/account";

  if (!callbackUrl || typeof callbackUrl !== "string") {
    return fallback;
  }

  const trimmed = callbackUrl.trim();

  // Must start with exactly one '/' and not '//' or '/\'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Must not contain backslashes
  if (trimmed.includes("\\")) {
    return fallback;
  }

  // Must not contain a protocol scheme (e.g. https:, http:, javascript:, data:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  // Customer restriction: never allow routing to /admin or /admin/*
  if (!options?.allowAdmin) {
    if (trimmed === "/admin" || trimmed.startsWith("/admin/") || trimmed.startsWith("/admin?")) {
      return fallback;
    }
  }

  return trimmed;
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

  if (configuredAdminEmail && (!userEmail || userEmail !== configuredAdminEmail)) {
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

export type AdminRouteDecision =
  | { action: "allow" }
  | { action: "redirect"; target: string }
  | { action: "rewrite"; target: string }
  | { action: "404" };

/**
 * Evaluates access rules for admin routes and configured ADMIN_LOGIN_PATH:
 * - A missing ADMIN_LOGIN_PATH env var disables the admin login route with a 404 (no fallback to /admin/login).
 * - Direct requests to /admin/login return a 404 unless ADMIN_LOGIN_PATH is explicitly set to /admin/login.
 * - Guests and non-admins accessing /admin or /admin/* receive a plain 404 (not a redirect).
 * - Requests matching ADMIN_LOGIN_PATH redirect to /admin if already authenticated as admin,
 *   or allow/rewrite to /admin/login for guests.
 */
export function evaluateAdminRouteAccess(params: {
  pathname: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  adminLoginPath?: string | null;
}): AdminRouteDecision {
  const { pathname, isLoggedIn, isAdmin } = params;
  const rawAdminLoginPath = params.adminLoginPath?.trim();
  const adminLoginPath =
    rawAdminLoginPath && rawAdminLoginPath.startsWith("/")
      ? rawAdminLoginPath
      : rawAdminLoginPath
      ? `/${rawAdminLoginPath}`
      : undefined;

  // 1. If path matches configured ADMIN_LOGIN_PATH
  if (adminLoginPath && pathname === adminLoginPath) {
    if (isAdmin) {
      return { action: "redirect", target: "/admin" };
    }
    if (pathname === "/admin/login") {
      return { action: "allow" };
    }
    return { action: "rewrite", target: "/admin/login" };
  }

  // 2. Admin routes protection (/admin, /admin/*)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login") {
      if (adminLoginPath === "/admin/login") {
        if (isAdmin) return { action: "redirect", target: "/admin" };
        return { action: "allow" };
      }
      return { action: "404" };
    }

    // Unauthenticated guests on /admin and /admin/* receive a plain 404
    if (!isLoggedIn) {
      return { action: "404" };
    }

    // Non-admin authenticated users on /admin and /admin/* receive a plain 404
    if (!isAdmin) {
      return { action: "404" };
    }

    return { action: "allow" };
  }

  return { action: "allow" };
}

