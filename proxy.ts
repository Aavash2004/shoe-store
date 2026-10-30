import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/auth.config";
import {
  sanitizeCallbackUrl,
  evaluateAdminRouteAccess,
  evaluateStaffRouteAccess,
  isStaffSession,
} from "@/lib/auth/authorization";

const { auth } = NextAuth(authConfig);

const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const userEmail = req.auth?.user?.email?.trim().toLowerCase();
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  // User must have ADMIN role; if ADMIN_EMAIL is set in env, it must match
  const isAdmin =
    isLoggedIn &&
    userRole === "ADMIN" &&
    (!configuredAdminEmail || (!!userEmail && userEmail === configuredAdminEmail));

  // Cheap JWT-only check for STAFF role (no DB hit in middleware)
  const isStaff = isLoggedIn && isStaffSession(req.auth);

  // Redirect legacy /auth/login to /login
  if (pathname === "/auth/login") {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    req.nextUrl.searchParams.forEach((val, key) => {
      loginUrl.searchParams.set(key, val);
    });
    return NextResponse.redirect(loginUrl, { headers: requestHeaders });
  }

  // Customer login route handling (/login)
  if (pathname === "/login") {
    if (isLoggedIn) {
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin", req.nextUrl.origin), {
          headers: requestHeaders,
        });
      }
      // Staff who visit /login get redirected to staff portal
      if (isStaff) {
        return NextResponse.redirect(new URL("/staff/orders", req.nextUrl.origin), {
          headers: requestHeaders,
        });
      }
      const rawCallbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      const target = sanitizeCallbackUrl(rawCallbackUrl, {
        allowAdmin: false,
        fallback: "/account",
      });
      return NextResponse.redirect(new URL(target, req.nextUrl.origin), {
        headers: requestHeaders,
      });
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Customer account routes handling (/account, /account/*)
  if (pathname.startsWith("/account")) {
    // Sub-routes (/account/orders, /account/profile, etc.) require logged in session
    if (pathname !== "/account") {
      if (!isLoggedIn) {
        const loginUrl = new URL("/login", req.nextUrl.origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl, { headers: requestHeaders });
      }
    }
  }

  // ============================================================
  // STAFF ROUTES — cheap JWT role check only, real gate is in layout/server actions
  // ============================================================
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    // Block ADMIN from being routed here via /staff (they use /admin)
    // Actually: allow ADMIN to access /staff/* for oversight
    const staffDecision = evaluateStaffRouteAccess({
      pathname,
      isLoggedIn,
      isStaff,
      isAdmin,
    });

    if (staffDecision.action === "404") {
      return new NextResponse(null, { status: 404, headers: requestHeaders });
    }

    if (staffDecision.action === "redirect") {
      return NextResponse.redirect(new URL(staffDecision.target, req.nextUrl.origin), {
        headers: requestHeaders,
      });
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // ============================================================
  // ADMIN ROUTES — STAFF is explicitly blocked (isAdmin is false for STAFF)
  // ============================================================
  const adminDecision = evaluateAdminRouteAccess({
    pathname,
    isLoggedIn,
    isAdmin, // false for STAFF role, so they get 404
    adminLoginPath: process.env.ADMIN_LOGIN_PATH || "/admin/login",
  });

  if (adminDecision.action === "404") {
    return new NextResponse(null, { status: 404, headers: requestHeaders });
  }

  if (adminDecision.action === "redirect") {
    return NextResponse.redirect(new URL(adminDecision.target, req.nextUrl.origin), {
      headers: requestHeaders,
    });
  }

  if (adminDecision.action === "rewrite") {
    requestHeaders.set("x-admin-login-allowed", "true");
    return NextResponse.rewrite(new URL(adminDecision.target, req.nextUrl.origin), {
      headers: requestHeaders,
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export default proxy;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|bmp|tiff|woff|woff2|ttf|eot)).*)",
  ],
};