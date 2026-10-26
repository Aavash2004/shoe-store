import "dotenv/config";

const testDbUrl = process.env.TEST_DATABASE_URL;
const appDbUrl = process.env.DATABASE_URL;

if (!testDbUrl) {
  console.error("FATAL: TEST_DATABASE_URL environment variable is not set. Refusing to run tests.");
  process.exit(1);
}

if (testDbUrl === appDbUrl) {
  console.error("FATAL: TEST_DATABASE_URL must differ from DATABASE_URL to prevent test data collision with the app database. Refusing to run tests.");
  process.exit(1);
}

// Redirect all Prisma connections and route handlers in this process to the isolated test database
process.env.DATABASE_URL = testDbUrl;
(process.env as any).NODE_ENV = "test";
