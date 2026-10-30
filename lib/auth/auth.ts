
import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

import {
  checkLoginLockout,
  recordFailedLogin,
  clearFailedLogins,
} from "@/lib/security/loginRateLimit";

// Custom error classes — Auth.js v5 surfaces these as res.code on the client
export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}
export class RateLimitLockedOutError extends CredentialsSignin {
  code = "locked_out";
}
export class AccountDeactivatedError extends CredentialsSignin {
  code = "account_deactivated";
}

/**
 * Dummy hash used when the user doesn't exist, so the response time is
 * indistinguishable from a real bcrypt compare. Prevents email enumeration.
 */
const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  adapter: PrismaAdapter(prisma as any),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          throw new InvalidCredentialsError();
        }

        const ip =
          (typeof request?.headers?.get === "function"
            ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
              request.headers.get("x-real-ip")
            : null) ||
          (credentials as any)?.clientIp ||
          "127.0.0.1";

        const email = (credentials.email as string).trim().toLowerCase();
        const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const loginType = (credentials.loginType as string) || "customer";

        // 1. Rate Limit Lockout Check (by IP + email, never locks the account itself)
        const lockout = await checkLoginLockout(ip, email);
        if (lockout.isLockedOut) {
          throw new RateLimitLockedOutError();
        }

        // ============================================================
        // ADMIN LOGIN
        // ============================================================
        if (loginType === "admin") {
          // Admin login: if configuredAdminEmail is set in env, email must match
          if (configuredAdminEmail && email !== configuredAdminEmail) {
            await recordFailedLogin(ip, email);
            throw new InvalidCredentialsError();
          }

          const user = await prisma.user.findUnique({ where: { email } });

          // Constant-time compare even if user doesn't exist
          if (!user || !user.password || user.role !== "ADMIN") {
            await bcrypt.compare(credentials.password as string, DUMMY_HASH);
            await recordFailedLogin(ip, email);
            throw new InvalidCredentialsError();
          }

          // Reject deactivated admin accounts
          if (!user.isActive) {
            await bcrypt.compare(credentials.password as string, DUMMY_HASH);
            await recordFailedLogin(ip, email);
            throw new InvalidCredentialsError();
          }

          // Reject STAFF trying to use admin login
          if ((user.role as string) === "STAFF") {
            await bcrypt.compare(credentials.password as string, DUMMY_HASH);
            await recordFailedLogin(ip, email);
            throw new InvalidCredentialsError();
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            await recordFailedLogin(ip, email);
            throw new InvalidCredentialsError();
          }

          // Clear rate limit failed count on success
          await clearFailedLogins(ip, email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        // ============================================================
        // STAFF LOGIN
        // ============================================================
        if (loginType === "staff") {
          const user = await prisma.user.findUnique({ where: { email } });

          // Constant-time compare even if user doesn't exist (prevents email enumeration)
          if (!user || !user.password) {
            await bcrypt.compare(credentials.password as string, DUMMY_HASH);
            await recordFailedLogin(ip, email);
            throw new InvalidCredentialsError();
          }

          // Only STAFF can log in through the staff door
          if (user.role !== "STAFF") {
            await bcrypt.compare(credentials.password as string, DUMMY_HASH);
            await recordFailedLogin(ip, email);
            throw new InvalidCredentialsError();
          }

          // Reject deactivated staff
          if (!user.isActive) {
            await bcrypt.compare(credentials.password as string, DUMMY_HASH);
            await recordFailedLogin(ip, email);
            throw new InvalidCredentialsError();
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            await recordFailedLogin(ip, email);
            throw new InvalidCredentialsError();
          }

          await clearFailedLogins(ip, email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        // ============================================================
        // CUSTOMER LOGIN
        // ============================================================

        // Must reject admin email with the exact same generic InvalidCredentialsError
        if (configuredAdminEmail && email === configuredAdminEmail) {
          await recordFailedLogin(ip, email);
          throw new InvalidCredentialsError();
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Constant-time compare even if user doesn't exist
        if (!user || !user.password) {
          await bcrypt.compare(credentials.password as string, DUMMY_HASH);
          await recordFailedLogin(ip, email);
          throw new InvalidCredentialsError();
        }

        // Reject ADMIN trying to use customer login
        if (user.role === "ADMIN") {
          await bcrypt.compare(credentials.password as string, DUMMY_HASH);
          await recordFailedLogin(ip, email);
          throw new InvalidCredentialsError();
        }

        // Reject STAFF trying to use customer login — each role uses its own door
        if (user.role === "STAFF") {
          await bcrypt.compare(credentials.password as string, DUMMY_HASH);
          await recordFailedLogin(ip, email);
          throw new InvalidCredentialsError();
        }

        // Reject deactivated accounts
        if (!user.isActive) {
          await bcrypt.compare(credentials.password as string, DUMMY_HASH);
          await recordFailedLogin(ip, email);
          throw new InvalidCredentialsError();
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          await recordFailedLogin(ip, email);
          throw new InvalidCredentialsError();
        }

        // Clear rate limit failed count on success
        await clearFailedLogins(ip, email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
