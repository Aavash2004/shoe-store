import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized() {
      // Allow custom middleware.ts to control route redirects cleanly without automatic redirect loops
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.email = (token.email as string) || session.user.email;
        session.user.name = (token.name as string) || session.user.name;
        session.user.role = (token.role as string) || session.user.role || "CUSTOMER";
      }
      return session;
    },
  },
};
