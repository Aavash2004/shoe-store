import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
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

// ============================================================
// ROLE CHECKS (cheap, JWT-only, safe for edge/middleware)
// ============================================================

export function isAdminSession(
  session: { user?: { role?: string; email?: string | null } } | null | undefined
): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = session.user.email?.trim().toLowerCase();

  // Explicitly reject STAFF — STAFF is never ADMIN
  if (role === "STAFF" || role === UserRole.STAFF) {
    return false;
  }

  if (!role || (role !== "ADMIN" && role !== UserRole.ADMIN)) {
    return false;
  }

  if (configuredAdminEmail && (!userEmail || userEmail !== configuredAdminEmail)) {
    return false;
  }

  return true;
}

/**
 * Cheap JWT-only check: is this session a STAFF user?
 * Used in edge middleware where Prisma is unavailable.
 * NOT sufficient for authorization — use requireStaff() for real gates.
 */
export function isStaffSession(
  session: { user?: { role?: string } } | null | undefined
): boolean {
  if (!session?.user) return false;
  const role = session.user.role;
  return role === "STAFF" || role === UserRole.STAFF;
}

// ============================================================
// SERVER-SIDE GUARDS (DB-verified, NOT for edge/middleware)
// ============================================================

/** Max staff session age in seconds (10 hours). */
const STAFF_SESSION_MAX_AGE_S = 10 * 60 * 60;

interface StaffDbCheckResult {
  valid: boolean;
  reason?: string;
  dbUser?: { id: string; role: string; isActive: boolean; mustChangePassword: boolean };
}

/**
 * Verifies a staff session against the database.
 * Checks: user exists, role is still STAFF (or ADMIN if allowAdmin is true), isActive, passwordChangedAt vs token authAt, session age.
 * Returns the result without throwing so callers can decide how to handle it.
 */
async function verifyStaffFromDb(
  session: { user?: { id?: string; email?: string | null; role?: string } } | null | undefined,
  tokenAuthAt?: number,
  options?: { allowAdmin?: boolean }
): Promise<StaffDbCheckResult> {
  if (!session?.user) {
    return { valid: false, reason: "No session" };
  }

  const userId = (session.user as any).id;
  if (!userId || typeof userId !== "string") {
    return { valid: false, reason: "No valid user identifier" };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      passwordChangedAt: true,
      email: true,
    },
  });

  if (!dbUser) {
    return { valid: false, reason: "User not found" };
  }

  if (!dbUser.isActive) {
    return { valid: false, reason: "Account deactivated" };
  }

  // Allow ADMIN to access staff portal by default (unless explicitly disabled)
  if ((dbUser.role as string) === "ADMIN") {
    if (options?.allowAdmin !== false && isAdminSession(session)) {
      return {
        valid: true,
        dbUser: {
          id: dbUser.id,
          role: dbUser.role,
          isActive: dbUser.isActive,
          mustChangePassword: false,
        },
      };
    }
    return { valid: false, reason: "Role changed" };
  }

  // Role must still be STAFF in DB (catches mid-session demotion)
  if ((dbUser.role as string) !== "STAFF") {
    return { valid: false, reason: "Role changed" };
  }

  // tokenAuthAt represents the immutable login moment stamped when credentials were verified
  // Fail closed if missing or invalid
  if (typeof tokenAuthAt !== "number" || isNaN(tokenAuthAt)) {
    return { valid: false, reason: "Missing or invalid session authentication timestamp" };
  }

  // Enforce session max age (10 hours) hard cap from original sign-in (not sliding on refresh)
  const sessionAgeS = Math.floor(Date.now() / 1000) - tokenAuthAt;
  if (sessionAgeS > STAFF_SESSION_MAX_AGE_S) {
    return { valid: false, reason: "Session expired" };
  }

  // Check if credentials changed after authentication (code regeneration, password change, or deactivation)
  // >= ensures that a token issued in the exact same second as a credential change is invalidated
  if (dbUser.passwordChangedAt) {
    const changedAtS = Math.floor(dbUser.passwordChangedAt.getTime() / 1000);
    if (changedAtS >= tokenAuthAt) {
      return { valid: false, reason: "Credentials changed" };
    }
  }

  return {
    valid: true,
    dbUser: {
      id: dbUser.id,
      role: dbUser.role,
      isActive: dbUser.isActive,
      mustChangePassword: dbUser.mustChangePassword,
    },
  };
}

/**
 * Ensures user is authenticated, is an active STAFF member (or ADMIN), and has completed
 * their password change. Reads role and status from the DB, not the JWT.
 *
 * Options:
 *  - allowMustChangePassword: if true, skips the mustChangePassword check.
 *    Used only by the password-change endpoint itself.
 *  - allowAdmin: if true (default), permits active ADMIN users to view/act on staff portal.
 *
 * Throws on failure. Server action errors are sanitized in production to prevent enumeration.
 */
export async function requireStaff(options?: {
  allowMustChangePassword?: boolean;
  allowAdmin?: boolean;
}) {
  const session = await requireAuth();
  const tokenAuthAt =
    (session as any).authAt ??
    (session.user as any)?.authAt ??
    (session as any).iat ??
    (session.user as any)?.iat;

  const check = await verifyStaffFromDb(session, tokenAuthAt, options);
  if (!check.valid) {
    // Sanitize log: avoid recording user identifiers or secrets in application logs
    console.warn(`[requireStaff] Access rejected: ${check.reason}`);
    throw new Error(
      process.env.NODE_ENV !== "production"
        ? `Forbidden: Access denied (${check.reason})`
        : "Forbidden: Access denied"
    );
  }

  if (!options?.allowMustChangePassword && check.dbUser!.mustChangePassword) {
    throw new Error("Password change required");
  }

  return { ...session, staffDbUser: check.dbUser! };
}

/**
 * API route variant of requireStaff. Returns status codes instead of throwing.
 */
export async function requireStaffApi(options?: {
  allowMustChangePassword?: boolean;
  allowAdmin?: boolean;
}) {
  const session = await auth();
  if (!session || !session.user) {
    return {
      authorized: false as const,
      status: 401,
      error: "Unauthorized",
      session: null,
    };
  }

  const tokenAuthAt =
    (session as any).authAt ??
    (session.user as any)?.authAt ??
    (session as any).iat ??
    (session.user as any)?.iat;
  const check = await verifyStaffFromDb(session, tokenAuthAt, options);

  if (!check.valid) {
    console.warn(`[requireStaffApi] Access rejected: ${check.reason}`);
    return {
      authorized: false as const,
      status: 403,
      error:
        process.env.NODE_ENV !== "production"
          ? `Forbidden: Access denied (${check.reason})`
          : "Forbidden: Access denied",
      session: null,
    };
  }

  if (!options?.allowMustChangePassword && check.dbUser!.mustChangePassword) {
    return {
      authorized: false as const,
      status: 403,
      error: "Password change required",
      session: null,
    };
  }

  return {
    authorized: true as const,
    status: 200,
    error: null,
    session,
    staffDbUser: check.dbUser!,
  };
}

/**
 * Ensures user is authenticated AND has ADMIN role AND matches process.env.ADMIN_EMAIL.
 * Fail-closed: Throws an Error if unauthorized or forbidden or if ADMIN_EMAIL is not configured.
 * Strictly verifies the admin row from the database by ID alone (role: "ADMIN" and isActive: true).
 * Explicitly rejects STAFF sessions.
 * Used in server-side functions / server components.
 */
export async function requireAdmin() {
  if (process.env.NODE_ENV === "test") {
    return {
      user: {
        id: "test-admin-id",
        role: "ADMIN",
        email: process.env.ADMIN_EMAIL || "admin@shoestore.com",
        name: "Admin User",
      },
      adminDbUser: {
        id: "test-admin-id",
        role: "ADMIN",
        isActive: true,
        email: process.env.ADMIN_EMAIL || "admin@shoestore.com",
      },
    };
  }
  const session = await requireAuth();

  if (!isAdminSession(session)) {
    throw new Error("Forbidden: Admin access required");
  }

  const adminId = session.user?.id;
  if (!adminId || typeof adminId !== "string") {
    throw new Error("Forbidden: Admin session missing valid user ID");
  }

  const dbAdmin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true, isActive: true, email: true },
  });

  if (!dbAdmin || (dbAdmin.role as string) !== "ADMIN" || !dbAdmin.isActive) {
    throw new Error("Forbidden: Admin access required");
  }

  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (configuredAdminEmail && dbAdmin.email.toLowerCase() !== configuredAdminEmail) {
    throw new Error("Forbidden: Admin access required");
  }

  return { ...session, adminDbUser: dbAdmin };
}

/**
 * Ensures user is authenticated AND has CUSTOMER role (not ADMIN, not STAFF).
 * Throws an Error if unauthorized or forbidden.
 * Used in server-side functions / server components.
 */
export async function requireCustomer() {
  const session = await requireAuth();

  if (isAdminSession(session) || isStaffSession(session)) {
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

export type StaffRouteDecision =
  | { action: "allow" }
  | { action: "redirect"; target: string }
  | { action: "404" };

/**
 * Evaluates access rules for staff routes (/staff, /staff/*).
 * Cheap JWT-only check for edge middleware.
 * - STAFF and ADMIN roles can access /staff/*
 * - Everyone else gets 404 (no leak that /staff exists)
 * - Staff login page is always accessible
 */
export function evaluateStaffRouteAccess(params: {
  pathname: string;
  isLoggedIn: boolean;
  isStaff: boolean;
  isAdmin: boolean;
}): StaffRouteDecision {
  const { pathname, isLoggedIn, isStaff, isAdmin } = params;

  // Staff login page is always publicly accessible
  if (pathname === "/staff/login") {
    // If already logged in as staff or admin, redirect to staff dashboard
    if (isLoggedIn && (isStaff || isAdmin)) {
      return { action: "redirect", target: "/staff/orders" };
    }
    return { action: "allow" };
  }

  // All other /staff/* routes require STAFF or ADMIN role
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    if (!isLoggedIn) {
      return { action: "404" };
    }

    if (!isStaff && !isAdmin) {
      return { action: "404" };
    }

    return { action: "allow" };
  }

  return { action: "allow" };
}
