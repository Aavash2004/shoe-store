# Prisma + Neon in Next.js Server Components

When configuring Prisma with Neon PostgreSQL (`@prisma/adapter-neon`) in Next.js:

1. **Prefer `PrismaNeonHttp` over `PrismaNeon`**:
   - `PrismaNeon` depends on WebSockets (`@neondatabase/serverless` `Pool`), which frequently throws obscure `ErrorEvent` exceptions during Next.js SSR/prerendering and Turbopack execution.
   - `PrismaNeonHttp` uses standard HTTP `fetch` calls, which work reliably in all Node.js and Next.js environments without requiring WebSocket constructors.

2. **Initialization Standard**:
   ```typescript
   import { PrismaClient } from "@/lib/generated/prisma/client";
   import { PrismaNeonHttp } from "@prisma/adapter-neon";

   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
   };

   const adapter = new PrismaNeonHttp(process.env.DATABASE_URL as string, {});

   export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

   if (process.env.NODE_ENV !== "production") {
     globalForPrisma.prisma = prisma;
   }
   ```

3. **No Interactive Transactions in HTTP Mode**:
   - `PrismaNeonHttp` uses standard HTTP fetch and does **NOT** support Prisma interactive transactions (`prisma.$transaction(async (tx) => ...)`). Calling `$transaction` will throw `Transactions are not supported in HTTP mode`.
   - Execute queries sequentially using direct `prisma` calls instead of `$transaction`.
