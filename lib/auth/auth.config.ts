import type { NextAuthConfig } from "next-auth";
import { UserRole } from "@/lib/generated/prisma/client";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized() {
      // Allow custom proxy.ts to control route redirects cleanly without automatic redirect loops
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
      }
      // Ensure token.iat is always a valid numeric timestamp for staff session age & invalidation
      if (typeof token.iat !== "number") {
        token.iat = Math.floor(Date.now() / 1000);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
        session.user.role = (token.role as string) || session.user.role || "CUSTOMER";
        (session as any).iat = typeof token.iat === "number" ? token.iat : undefined;
      }
      return session;
    },
  },
};
