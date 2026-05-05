/**
 * Tiny HTTP helpers for the integration test suite. We hit the dev
 * server at TEST_BASE_URL (defaults to http://localhost:3000) — the
 * tester is expected to have `pnpm dev` running in another terminal.
 *
 * Cookie jar is a Map<name, value>; good enough for the single
 * os-session cookie this app uses. Bearer wrapper is even simpler.
 */
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
