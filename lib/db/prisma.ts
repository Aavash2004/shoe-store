import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getCleanConnectionString(): string {
  const url = process.env.DATABASE_URL || "";
  return url
    .replace("?channel_binding=require&", "?")
    .replace("&channel_binding=require", "")
    .replace("?channel_binding=require", "");
}

function createPrismaClient(): PrismaClient {
  const connectionString = getCleanConnectionString();
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  // Eager non-blocking connection warmup in development to eliminate cold-start latency
  prisma.$connect().catch(() => {});
}

/**
 * Reusable server-side database health check helper
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<{ connected: number }[]>`SELECT 1 as connected`;
    return Array.isArray(result) && result.length > 0 && result[0].connected === 1;
  } catch (error) {
    console.error("[Database Health Check] Failed to connect to Neon PostgreSQL:", error);
    return false;
  }
}