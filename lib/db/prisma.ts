import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function getCleanConnectionString(): string {
  // At runtime, prioritize the pooled connection string (DATABASE_URL)
  // Fall back to unpooled or direct URLs only if DATABASE_URL is not set
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || "";
  // Strip unsupported query parameters if needed, but maintain standard ssl connection
  return url.split("?")[0];
}

function createPrismaClient(): PrismaClient {
  const connectionString = getCleanConnectionString();
  const pool =
    globalForPrisma.pool ??
    new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      // In serverless environments, limit max connections per container to prevent pool exhaustion under concurrency
      max: process.env.NODE_ENV === "production" ? 2 : 10,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  prisma.$connect().catch((err) => {
    console.error("[Prisma Connection Warmup Warning]:", err);
  });
}

/**
 * Reusable server-side database health check helper
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<{ connected: number }[]>`SELECT 1 as connected`;
    return Array.isArray(result) && result.length > 0 && result[0].connected === 1;
  } catch (error) {
    console.error("[Database Health Check] Failed to connect to PostgreSQL:", error);
    return false;
  }
}