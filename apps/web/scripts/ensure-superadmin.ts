/**
 * Bootstrap the single superadmin account from environment variables.
 *
 * Runs on every deploy (wired into `vercel-build`) and in dev (called by the
 * seed, or run directly via `pnpm db:ensure-superadmin`). Idempotent: it
 * upserts the account identified by SUPERADMIN_EMAIL, (re)setting its password
 * from SUPERADMIN_PASSWORD and marking it role=admin + isSuperadmin + verified.
 *
 * If SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD aren't set, it logs a warning and
 * does nothing — the deployer must fill those in before a superadmin exists.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";
import "dotenv/config";

// Lucia v3's published argon2id parameters (match lib/auth.ts).
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

function handleBase(name: string, email: string): string {
  const src = (name || email.split("@")[0] || "superadmin")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return src || "superadmin";
}

async function uniqueHandle(
  prisma: PrismaClient,
  name: string,
  email: string,
): Promise<string> {
  const base = handleBase(name, email);
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? `@${base}` : `@${base}-${i}`;
    const taken = await prisma.user.findUnique({
      where: { handle: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error("Could not generate a unique handle for the superadmin.");
}

/** Ensure the env-configured superadmin exists. Safe to call repeatedly.
 *  Returns true if an account was created/updated, false if skipped. */
export async function ensureSuperadmin(prisma: PrismaClient): Promise<boolean> {
  const email = process.env.SUPERADMIN_EMAIL?.trim();
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME?.trim() || "Superadmin";

  if (!email || !password) {
    console.warn(
      "[ensure-superadmin] SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD not set — skipping superadmin bootstrap.",
    );
    return false;
  }

  const passwordHash = await hash(password, ARGON2_OPTS);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        passwordHash,
        role: "admin",
        isSuperadmin: true,
        // Don't re-gate an already-verified account; verify if it wasn't.
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      },
    });
    console.log(`[ensure-superadmin] Updated ${email} as superadmin.`);
  } else {
    const handle = await uniqueHandle(prisma, name, email);
    await prisma.user.create({
      data: {
        email,
        name,
        handle,
        initial: (name[0] ?? "S").toUpperCase(),
        passwordHash,
        role: "admin",
        isSuperadmin: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`[ensure-superadmin] Created superadmin ${email}.`);
  }
  return true;
}

async function main() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[ensure-superadmin] No DATABASE_URL(_DIRECT) — skipping superadmin bootstrap.",
    );
    return;
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
  try {
    await ensureSuperadmin(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// Run when invoked directly (pnpm db:ensure-superadmin / vercel-build), but
// not when imported (e.g. by the seed).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("[ensure-superadmin]", err);
    process.exit(1);
  });
}
