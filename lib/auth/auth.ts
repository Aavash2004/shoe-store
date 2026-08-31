
import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

// Custom error classes — Auth.js v5 surfaces these as res.code on the client
class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}
class AdminOnCustomerLoginError extends CredentialsSignin {
  code = "admin_use_admin_login";
}
class CustomerOnAdminLoginError extends CredentialsSignin {
  code = "unauthorized_admin";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new InvalidCredentialsError();
        }

        const email = (credentials.email as string).trim().toLowerCase();
        const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const loginType = (credentials.loginType as string) || "customer";

        if (loginType === "admin") {
          // Admin login: ONLY allow configured ADMIN_EMAIL with role === ADMIN
          if (configuredAdminEmail && email !== configuredAdminEmail) {
            throw new InvalidCredentialsError();
          }

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.password || user.role !== "ADMIN") {
            throw new InvalidCredentialsError();
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isValid) {
            throw new InvalidCredentialsError();
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        // Customer login: strictly REJECT admin email or admin role
        if (configuredAdminEmail && email === configuredAdminEmail) {
          throw new AdminOnCustomerLoginError();
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (user && user.role === "ADMIN") {
          throw new AdminOnCustomerLoginError();
        }

        if (!user || !user.password) {
          throw new InvalidCredentialsError();
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          throw new InvalidCredentialsError();
        }

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
