
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
        const user = await prisma.user.findUnique({ where: { email } });

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

        const loginType = (credentials.loginType as string) || "customer";

        // Admin accounts cannot log into customer login
        if (loginType === "customer" && user.role === "ADMIN") {
          throw new AdminOnCustomerLoginError();
        }

        // Customer accounts cannot log into admin login
        if (loginType === "admin" && user.role !== "ADMIN") {
          throw new CustomerOnAdminLoginError();
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
