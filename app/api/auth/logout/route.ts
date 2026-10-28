import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signOut } from "@/lib/auth/auth";

export const runtime = "nodejs";

const AUTH_COOKIE_PATTERNS = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
];

async function clearAllAuthCookies() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // 1. Clear known cookies directly
  for (const name of AUTH_COOKIE_PATTERNS) {
    try {
      cookieStore.delete(name);
      cookieStore.set(name, "", {
        maxAge: 0,
        path: "/",
        expires: new Date(0),
        sameSite: "lax",
        httpOnly: true,
        secure: true,
      });
      cookieStore.set(name, "", {
        maxAge: 0,
        path: "/",
        expires: new Date(0),
        sameSite: "lax",
        httpOnly: true,
        secure: false,
      });
    } catch {}
  }

  // 2. Also clear any chunked or dynamic variants (e.g. authjs.session-token.0)
  for (const cookie of allCookies) {
    const isAuth =
      cookie.name.includes("authjs") ||
      cookie.name.includes("next-auth") ||
      cookie.name.includes("session-token");

    if (isAuth) {
      try {
        cookieStore.delete(cookie.name);
        cookieStore.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
          expires: new Date(0),
          sameSite: "lax",
          httpOnly: true,
          secure: true,
        });
        cookieStore.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
          expires: new Date(0),
          sameSite: "lax",
          httpOnly: true,
          secure: false,
        });
      } catch {}
    }
  }

  // 3. Trigger server-side NextAuth signOut
  try {
    await signOut({ redirect: false });
  } catch {}
}

export async function POST() {
  try {
    await clearAllAuthCookies();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Error clearing auth cookies in /api/auth/logout:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to log out" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await clearAllAuthCookies();
  } catch (error) {
    console.error("Error in GET /api/auth/logout:", error);
  }

  const url = new URL("/", request.url);
  return NextResponse.redirect(url);
}
