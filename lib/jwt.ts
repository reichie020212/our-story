import { createHash, randomBytes } from "node:crypto";
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from "jose";
import { db } from "./db";

// Mobile auth uses an asymmetric key pair (RS256) per the brief:
//   • access token = short-lived (15 min) RS256 JWT carrying { sub, exp }.
//   • refresh token = opaque 256-bit string handed to the client. The
//     server only stores its sha256 hash — even a snapshot of the
//     mobile_refresh_tokens table can't be replayed.
//
// Keys come from env vars (PEM, with literal \n sequences for newlines
// so .env files stay one-line-per-key). They're parsed once and cached.

const ACCESS_TTL_SECONDS = 60 * 15; // 15 minutes
const REFRESH_TTL_DAYS = 30;
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
const ALG = "RS256";
const ISS = "ourstory";

export class MobileAuthNotConfiguredError extends Error {
  constructor() {
    super(
      "Mobile auth is not configured — set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY (PEM, RSA) in your env.",
    );
  }
}

let cachedPrivate: CryptoKey | null = null;
let cachedPublic: CryptoKey | null = null;

function unescapePem(input: string): string {
  // Allow JWT_*_KEY to be the raw PEM (multi-line) OR a single-line
  // string with literal "\n" between rows — whichever is easier to put
  // in a .env file.
  return input.replace(/\\n/g, "\n").trim();
}

async function getPrivateKey(): Promise<CryptoKey> {
  if (cachedPrivate) return cachedPrivate;
  const raw = process.env.JWT_PRIVATE_KEY;
  if (!raw) throw new MobileAuthNotConfiguredError();
  cachedPrivate = await importPKCS8(unescapePem(raw), ALG);
  return cachedPrivate;
}

async function getPublicKey(): Promise<CryptoKey> {
  if (cachedPublic) return cachedPublic;
  const raw = process.env.JWT_PUBLIC_KEY;
  if (!raw) throw new MobileAuthNotConfiguredError();
  cachedPublic = await importSPKI(unescapePem(raw), ALG);
  return cachedPublic;
}

export type AccessTokenPayload = {
  sub: string;
  iat: number;
  exp: number;
  iss: string;
};

export async function signAccessToken(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const key = await getPrivateKey();
  const expiresAt = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISS)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(key);
  return { token, expiresAt };
}

export async function verifyAccessToken(token: string): Promise<{
  userId: string;
}> {
  const key = await getPublicKey();
  const { payload } = await jwtVerify(token, key, {
    algorithms: [ALG],
    issuer: ISS,
  });
  if (!payload.sub) throw new Error("Token missing subject.");
  return { userId: payload.sub };
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("base64url");
}

export async function issueRefreshToken(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await db.mobileRefreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });
  return { token: raw, expiresAt };
}

/** Validate a presented refresh token, rotate it, and return the new
 *  pair. Old token is marked revoked so a leaked one can be detected
 *  by audit. */
export async function rotateRefreshToken(presented: string): Promise<{
  userId: string;
  refresh: { token: string; expiresAt: Date };
}> {
  const tokenHash = hashToken(presented);
  const row = await db.mobileRefreshToken.findUnique({
    where: { tokenHash },
  });
  if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) {
    throw new InvalidRefreshTokenError();
  }
  const newRaw = randomBytes(32).toString("base64url");
  const newHash = hashToken(newRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await db.$transaction([
    db.mobileRefreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    }),
    db.mobileRefreshToken.create({
      data: { tokenHash: newHash, userId: row.userId, expiresAt },
    }),
  ]);
  return {
    userId: row.userId,
    refresh: { token: newRaw, expiresAt },
  };
}

export async function revokePresentedRefreshToken(
  presented: string,
): Promise<void> {
  const tokenHash = hashToken(presented);
  await db.mobileRefreshToken
    .updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => {
      /* best-effort */
    });
}

export async function revokeUserRefreshTokens(userId: string): Promise<void> {
  await db.mobileRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super("Refresh token is invalid, revoked, or expired.");
  }
}
