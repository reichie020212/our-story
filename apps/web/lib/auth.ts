/**
 * Session helpers — hand-rolled because Lucia v3's Prisma adapter peers
 * against Prisma 4/5 and we're on 7 (and Lucia is upstream-retired).
 *
 * Shape mirrors Lucia's surface area enough that callers stay simple:
 *   const session = await createSession(user.id);
 *   const { user } = await validateSession(sessionId);
 *   await invalidateSession(sessionId);
 */
import { randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { User } from "@prisma/client";
import type { PublicUser } from "@our-story/api-types";
import { db } from "./db";

// Re-export PublicUser so existing `import { type PublicUser } from
// "./auth"` callers in apps/web keep working; the source of truth is
// the shared @our-story/api-types package.
export type { PublicUser };

const SESSION_TTL_DAYS = 30;
const SESSION_RENEW_THRESHOLD_DAYS = 15;
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

export type SessionValidation =
  | { session: null; user: null }
  | {
      session: { id: string; userId: string; expiresAt: Date; fresh: boolean };
      user: PublicUser;
    };

export function generateSessionId(): string {
  // 192 bits of entropy, base64url-safe — enough that we never need to
  // worry about a meaningful collision in the session table.
  return randomBytes(24).toString("base64url");
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  return verify(stored, plain, ARGON2_OPTS);
}

function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    initial: user.initial,
  };
}

export async function createSession(userId: string) {
  const id = generateSessionId();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  await db.session.create({ data: { id, userId, expiresAt } });
  return { id, userId, expiresAt, fresh: true } as const;
}

export async function validateSession(
  sessionId: string,
): Promise<SessionValidation> {
  const row = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
  if (!row) return { session: null, user: null };

  // Expired — clean up and reject.
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: row.id } }).catch(() => {});
    return { session: null, user: null };
  }

  // Sliding renewal: when the session is past the half-life, push expiry
  // back to the full TTL. The `fresh` flag tells callers they need to
  // re-set the cookie with the new max-age.
  const renewAt = new Date(
    row.expiresAt.getTime() -
      SESSION_RENEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  );
  let expiresAt = row.expiresAt;
  let fresh = false;
  if (Date.now() >= renewAt.getTime()) {
    expiresAt = new Date(
      Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    await db.session.update({
      where: { id: row.id },
      data: { expiresAt },
    });
    fresh = true;
  }

  return {
    session: { id: row.id, userId: row.userId, expiresAt, fresh },
    user: publicUser(row.user),
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.session.delete({ where: { id: sessionId } }).catch(() => {});
}

export async function findPublicUser(
  userId: string,
): Promise<PublicUser | null> {
  const row = await db.user.findUnique({ where: { id: userId } });
  return row ? publicUser(row) : null;
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

const HANDLE_RANDOM_SUFFIX_LEN = 4;

export function baseHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

/** Pick a unique handle. On collision, append a short random suffix
 *  silently (per project decision: no second signup screen). */
export async function uniqueHandle(name: string): Promise<string> {
  const base = baseHandle(name) || "writer";
  for (let i = 0; i < 5; i++) {
    const candidate =
      i === 0
        ? `@${base}`
        : `@${base}-${randomBytes(HANDLE_RANDOM_SUFFIX_LEN)
            .toString("base64url")
            .slice(0, HANDLE_RANDOM_SUFFIX_LEN)
            .toLowerCase()}`;
    const taken = await db.user.findUnique({
      where: { handle: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error("Could not generate a unique handle after 5 attempts.");
}

export function initialFromName(name: string): string {
  const cleaned = name.trim();
  return (cleaned[0] ?? "U").toUpperCase();
}
