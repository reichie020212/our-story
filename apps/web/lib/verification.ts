/**
 * Email verification token helpers.
 *
 * Tokens are 32 random bytes (base64url) handed out in the verification
 * email link. Only the sha256 hash is stored, so the table never holds
 * a working credential at rest. Single-use: on success we set
 * consumedAt; resends delete any prior unconsumed rows for that user so
 * the most recent link is the only working one.
 */
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

export const VERIFICATION_TTL_HOURS = 24;
const VERIFICATION_TTL_MS = VERIFICATION_TTL_HOURS * 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("base64url");
}

/** Mint a fresh verification token for the user. Any previously
 *  unconsumed tokens for the same user are deleted in the same
 *  transaction — only the latest link works. Returns the *raw* token
 *  (the one to put in the email link). */
export async function issueVerificationToken(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  await db.$transaction([
    db.emailVerificationToken.deleteMany({
      where: { userId, consumedAt: null },
    }),
    db.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);
  return { token: raw, expiresAt };
}

export type VerificationResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "consumed" };

/** Atomically consume a verification token. Marks the User as verified
 *  and stamps consumedAt on the token row. Idempotent only in the sense
 *  that a second call returns `consumed` — it won't re-verify. */
export async function consumeVerificationToken(
  raw: string,
): Promise<VerificationResult> {
  const tokenHash = hashToken(raw);
  const row = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      consumedAt: true,
    },
  });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.consumedAt) return { ok: false, reason: "consumed" };
  if (row.expiresAt.getTime() <= Date.now())
    return { ok: false, reason: "expired" };

  // Set the verification timestamp + consume the token together so we
  // can never end up with a "consumed but not verified" inconsistency.
  await db.$transaction([
    db.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    db.emailVerificationToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    }),
  ]);
  return { ok: true, userId: row.userId };
}
