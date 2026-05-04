import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SESSION_COOKIE_NAME } from "./session";

/** Best-effort client IP. On Vercel + most reverse proxies, the first
 *  entry of x-forwarded-for is the real client. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "0.0.0.0";
}

export async function userAgent(): Promise<string> {
  const h = await headers();
  return h.get("user-agent") ?? "";
}

export async function sessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAME)?.value ?? null;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Hash used for view dedup: sha256(ip + ua + day_bucket). The day
 *  bucket means the same IP+UA gets a fresh hash each day, which is
 *  what makes the unique constraint on (storyId, sessionHash) work as
 *  a 24h dedup window. */
export function viewDedupHash(ip: string, ua: string): string {
  const dayBucket = Math.floor(Date.now() / ONE_DAY_MS);
  return createHash("sha256")
    .update(`${ip}|${ua}|${dayBucket}`)
    .digest("base64url");
}

/** Stable identifier for per-session rate limits: the session cookie
 *  if present (so signed-in users aren't penalised for sharing an IP
 *  with their household), otherwise sha256(ip + ua). */
export async function rateLimitKey(): Promise<string> {
  const session = await sessionCookie();
  if (session) return `s:${session}`;
  const ip = await clientIp();
  const ua = await userAgent();
  return (
    "i:" +
    createHash("sha256").update(`${ip}|${ua}`).digest("base64url").slice(0, 32)
  );
}
