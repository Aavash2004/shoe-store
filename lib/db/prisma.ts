import 'dotenv/config'
import { PrismaClient } from '../generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'

// Schema version tag ensures hot module reload discards stale in-memory Prisma Client engine
const SCHEMA_VERSION = "20261001-add-image-color";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

if (globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}

export { prisma } 