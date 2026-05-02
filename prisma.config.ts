import { defineConfig } from "prisma/config";
import "dotenv/config";

// Prisma 7: connection URLs live here, not in schema.prisma. The pooled
// URL is for the runtime client (handed via adapter); Migrate uses the
// direct URL to avoid pgbouncer's prepared-statement quirks. We read the
// env vars directly rather than via prisma's `env()` helper so missing
// values don't crash `prisma generate` in environments without a DB
// (e.g. CI before the Neon project is provisioned).
const { DATABASE_URL_DIRECT, DATABASE_URL, SHADOW_DATABASE_URL } = process.env;

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: DATABASE_URL_DIRECT ?? DATABASE_URL ?? "",
    ...(SHADOW_DATABASE_URL ? { shadowDatabaseUrl: SHADOW_DATABASE_URL } : {}),
  },
  migrations: {
    path: "./prisma/migrations",
  },
});
