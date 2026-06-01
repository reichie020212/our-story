/**
 * Tiny HTTP helpers for the integration test suite. We hit the dev
 * server at TEST_BASE_URL (defaults to http://localhost:3000) — the
 * tester is expected to have `pnpm dev` running in another terminal.
 *
 * Cookie jar is a Map<name, value>; good enough for the single
 * os-session cookie this app uses. Bearer wrapper is even simpler.
 *
 * DB helpers (markEmailVerified et al.) talk to the same Neon database
 * the dev server is using — they're an escape hatch for tests that
 * don't want to walk through the email-verification ceremony for every
 * signup.
 */
import { db } from "@/lib/db";
import { issueVerificationToken } from "@/lib/verification";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

/** Probe the dev server. Throws a clear error if it's not running. */
export async function assertServerRunning(): Promise<void> {
  try {
    const res = await fetch(BASE_URL, { method: "GET" });
    if (res.status >= 500) {
      throw new Error(`server returned ${res.status}`);
    }
  } catch (err) {
    throw new Error(
      `Integration tests need a dev server on ${BASE_URL}. Run \`pnpm dev\` ` +
        `(or set TEST_BASE_URL) and re-run. Original error: ${(err as Error).message}`,
    );
  }
}

export class CookieJar {
  private cookies = new Map<string, string>();

  capture(res: Response): void {
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return;
    // The set-cookie header may carry multiple cookies separated by
    // commas, but commas can also appear inside Expires dates. Split
    // on ", <name>=" to be safe — for this app there's typically one
    // cookie per response so the simple split holds.
    const pairs = setCookie.split(/,\s*(?=[^;,]+=)/);
    for (const pair of pairs) {
      const [namePart] = pair.split(";", 1);
      const [name, ...rest] = namePart.split("=");
      if (!name) continue;
      const value = rest.join("=");
      // empty value or maxAge=0 = clear
      if (value === "" || /max-age=0\b/i.test(pair)) {
        this.cookies.delete(name.trim());
      } else {
        this.cookies.set(name.trim(), value);
      }
    }
  }

  header(): string {
    return [...this.cookies.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }
}

type FetchOpts = RequestInit & { jar?: CookieJar; bearer?: string };

export async function api<T = unknown>(
  path: string,
  opts: FetchOpts = {},
): Promise<{ status: number; body: T }> {
  const headers = new Headers(opts.headers);
  if (opts.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.jar) {
    const c = opts.jar.header();
    if (c) headers.set("Cookie", c);
  }
  if (opts.bearer) {
    headers.set("Authorization", `Bearer ${opts.bearer}`);
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers });
  if (opts.jar) opts.jar.capture(res);
  let body: T;
  if (res.status === 204) {
    body = undefined as T;
  } else {
    try {
      body = (await res.json()) as T;
    } catch {
      body = undefined as T;
    }
  }
  return { status: res.status, body };
}

/** Generate a per-test-run email so re-runs don't 409 on duplicates. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}.${Math.floor(Math.random() * 1e6)}@ourstory.test`;
}

/** Mark a user verified directly. Use when the test is exercising a
 *  downstream flow (signin, password change, story creation) and the
 *  pre-verification gate isn't what's being tested. */
export async function markEmailVerified(email: string): Promise<void> {
  await db.user.update({
    where: { email },
    data: { emailVerifiedAt: new Date() },
  });
}

/** Mint a fresh verification token for the email and return the *raw*
 *  token. Useful for testing the verify-email endpoint without an
 *  email service. Replaces any prior unconsumed token for that user. */
export async function issueRawVerificationToken(email: string): Promise<{
  token: string;
  expiresAt: Date;
  userId: string;
}> {
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  const { token, expiresAt } = await issueVerificationToken(user.id);
  return { token, expiresAt, userId: user.id };
}

/** Backdate every pending token for a user so the verify endpoint
 *  treats them as expired. Used to test the expired-link branch. */
export async function expireVerificationTokens(email: string): Promise<void> {
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  await db.emailVerificationToken.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
}

/** Whether a user has been email-verified yet. */
export async function isEmailVerified(email: string): Promise<boolean> {
  const u = await db.user.findUnique({
    where: { email },
    select: { emailVerifiedAt: true },
  });
  return !!u?.emailVerifiedAt;
}

/** Promote/demote a user directly. Lets the approval-flow tests mint an
 *  admin without a user-management UI round-trip. */
export async function setUserRole(
  email: string,
  role: "user" | "admin",
): Promise<void> {
  await db.user.update({ where: { email }, data: { role } });
}

/** Flip the global approval gate directly (test setup/teardown). */
export async function setApprovalRequired(value: boolean): Promise<void> {
  await db.appSetting.upsert({
    where: { id: "global" },
    create: { id: "global", approvalRequired: value },
    update: { approvalRequired: value },
  });
}
