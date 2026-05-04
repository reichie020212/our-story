import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Tests sit next to the code they cover; one suite, one file.
    include: ["__tests__/**/*.test.ts"],

    // Read .env so tests have DATABASE_URL etc. available the same
    // way the app does at runtime.
    setupFiles: ["__tests__/setup.ts"],

    // Public-read tests are idempotent against the seed, so parallel
    // is fine. When auth/mutation tests land, switch to serial or
    // per-suite isolation.
    pool: "threads",

    // Slower than unit tests because they hit Neon — bump default
    // timeout to keep flake low on cold connections.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
