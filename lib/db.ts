import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma client singleton. Next.js dev rebuilds re-import this module
// many times during HMR; caching on globalThis stops us from leaking
// Postgres connections every reload.
//
// Prisma 7 requires a driver adapter. We always use the pooled URL at
// runtime; the unpooled DATABASE_URL_DIRECT is reserved for Migrate
// (configured in prisma.config.ts).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function makeClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_DIRECT;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill in the Neon connection strings.",
    );
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const db: PrismaClient = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
