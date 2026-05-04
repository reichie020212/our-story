import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma client singleton, constructed lazily so importing this module
// at build time (e.g. during Next.js's "collecting page data" pass)
// doesn't crash when DATABASE_URL hasn't been set yet.
//
// Caching on globalThis keeps Next.js dev HMR from leaking Postgres
// connections — every reload re-imports this module, but the same
// PrismaClient instance survives.
//
// Prisma 7 requires a driver adapter; we always use the pooled URL at
// runtime. The unpooled DATABASE_URL_DIRECT is reserved for Migrate
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

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = makeClient();
  }
  return globalForPrisma.prisma;
}

// Proxy so callers can write `db.user.findUnique(...)` exactly as if
// `db` were a plain PrismaClient — but the real client is only created
// the first time a property is read.
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getClient() as object, prop);
  },
});
