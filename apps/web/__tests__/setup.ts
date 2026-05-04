/**
 * Vitest setup — load .env so the same DATABASE_URL the dev server
 * uses is visible to imported route handlers, and fail loudly if
 * the test prerequisites aren't in place.
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { beforeAll } from "vitest";

loadEnv({ path: path.resolve(__dirname, "..", ".env") });

beforeAll(() => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Tests hit the Neon database via the same " +
        ".env the dev server uses; populate apps/web/.env first.",
    );
  }
});
