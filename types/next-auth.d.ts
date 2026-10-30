import { UserRole } from "@/lib/generated/prisma/client";
import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    iat?: number;
    authAt?: number;
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole | string;
      iat?: number;
      authAt?: number;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: UserRole | string;
    iat?: number;
    authAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: UserRole | string;
    iat?: number;
    authAt?: number;
  }
}
