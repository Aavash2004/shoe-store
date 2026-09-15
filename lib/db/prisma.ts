import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function getConnectionString(): string {
  // At runtime, prioritize the pooled connection string (DATABASE_URL)
  // Fall back to unpooled or direct URLs only if DATABASE_URL is not set
  return (
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DIRECT_URL ||
    ""
  );
}

function createPrismaClient(): PrismaClient {
  const connectionString = getConnectionString();
  const isSsl = connectionString.includes("sslmode=require") || connectionString.includes("ssl=true");

  const pool =
    globalForPrisma.pool ??
    new pg.Pool({
      connectionString,
      ssl: isSsl ? true : undefined,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 60000,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
    });

  // Handle pool errors gracefully so dropped idle connections don't crash or hang the app
  pool.on("error", (err) => {
    console.warn("[Database Pool Warning] Idle connection dropped or reset:", err.message);
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