import { GitHub, Google, generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";

// OAuth provider names match Prisma's OAuthProvider enum.
export type OAuthProviderName = "google" | "github";

export function isOAuthProvider(p: string): p is OAuthProviderName {
  return p === "google" || p === "github";
}

const STATE_COOKIE = "os-oauth-state";
const PKCE_COOKIE = "os-oauth-pkce";
const NEXT_COOKIE = "os-oauth-next";
const COOKIE_TTL_SECONDS = 600; // 10 minutes is plenty for the round-trip.

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function callbackUrl(provider: OAuthProviderName): string {
  return `${siteUrl()}/api/v1/auth/oauth/${provider}/callback`;
}

export class OAuthNotConfiguredError extends Error {
  constructor(provider: OAuthProviderName) {
    super(
      `${provider} OAuth is not configured — set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET.`,
    );
  }
}

export function getProviderClient(name: OAuthProviderName) {
  if (name === "google") {
    const id = process.env.GOOGLE_CLIENT_ID;
    const secret = process.env.GOOGLE_CLIENT_SECRET;
    if (!id || !secret) throw new OAuthNotConfiguredError(name);
    return new Google(id, secret, callbackUrl(name));
  }
  const id = process.env.GITHUB_CLIENT_ID;
  const secret = process.env.GITHUB_CLIENT_SECRET;
  if (!id || !secret) throw new OAuthNotConfiguredError(name);
  return new GitHub(id, secret, callbackUrl(name));
}

export function makeAuthorizationURL(
  provider: OAuthProviderName,
  state: string,
): { url: URL; codeVerifier: string | null } {
  const client = getProviderClient(provider);
  if (provider === "google") {
    const codeVerifier = generateCodeVerifier();
    const url = (client as Google).createAuthorizationURL(state, codeVerifier, [
      "openid",
      "profile",
      "email",
    ]);
    return { url, codeVerifier };
  }
  const url = (client as GitHub).createAuthorizationURL(state, [
    "read:user",
    "user:email",
  ]);
  return { url, codeVerifier: null };
}

export type OAuthProfile = {
  id: string;
  email: string;
  name: string;
};

/** Fetch the canonical profile from the provider. Both providers verify
 *  email addresses, so we treat the resulting `email` as trusted enough
 *  to link by-email on first sign-in. */
export async function fetchProfile(
  provider: OAuthProviderName,
  accessToken: string,
): Promise<OAuthProfile> {
  if (provider === "google") {
    const res = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      throw new Error(`Google userinfo failed (${res.status}).`);
    }
    const data = (await res.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!data.sub || !data.email) {
      throw new Error("Google userinfo missing sub or email.");
    }
    if (data.email_verified === false) {
      throw new Error(
        "Your Google account's email isn't verified — please verify it with Google first.",
      );
    }
    return {
      id: data.sub,
      email: data.email.toLowerCase(),
      name: data.name?.trim() || data.email.split("@")[0] || "Reader",
    };
  }

  // GitHub: /user gives id + name; primary verified email comes from
  // /user/emails (not always exposed on /user when the user has it set
  // to private).
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "OurStory",
    },
  });
  if (!userRes.ok) throw new Error(`GitHub /user failed (${userRes.status}).`);
  const user = (await userRes.json()) as {
    id?: number;
    login?: string;
    name?: string | null;
  };
  if (typeof user.id !== "number" || !user.login) {
    throw new Error("GitHub /user response missing id or login.");
  }

  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "OurStory",
    },
  });
  if (!emailsRes.ok) {
    throw new Error(`GitHub /user/emails failed (${emailsRes.status}).`);
  }
  const emails = (await emailsRes.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;
  const primary =
    emails.find((e) => e.primary && e.verified) ??
    emails.find((e) => e.verified);
  if (!primary) {
    throw new Error(
      "Your GitHub account doesn't have a verified email — verify one with GitHub first.",
    );
  }
  return {
    id: String(user.id),
    email: primary.email.toLowerCase(),
    name: user.name?.trim() || user.login,
  };
}

/** Set the short-lived cookies that survive the redirect to the provider. */
export async function setOAuthCookies(opts: {
  state: string;
  codeVerifier: string | null;
  next: string | null;
}) {
  const jar = await cookies();
  jar.set(STATE_COOKIE, opts.state, {
    ...cookieOpts,
    maxAge: COOKIE_TTL_SECONDS,
  });
  if (opts.codeVerifier) {
    jar.set(PKCE_COOKIE, opts.codeVerifier, {
      ...cookieOpts,
      maxAge: COOKIE_TTL_SECONDS,
    });
  }
  if (opts.next) {
    jar.set(NEXT_COOKIE, opts.next, {
      ...cookieOpts,
      maxAge: COOKIE_TTL_SECONDS,
    });
  }
}

export async function consumeOAuthCookies(): Promise<{
  state: string | null;
  codeVerifier: string | null;
  next: string | null;
}> {
  const jar = await cookies();
  const state = jar.get(STATE_COOKIE)?.value ?? null;
  const codeVerifier = jar.get(PKCE_COOKIE)?.value ?? null;
  const next = jar.get(NEXT_COOKIE)?.value ?? null;
  jar.set(STATE_COOKIE, "", { ...cookieOpts, maxAge: 0 });
  jar.set(PKCE_COOKIE, "", { ...cookieOpts, maxAge: 0 });
  jar.set(NEXT_COOKIE, "", { ...cookieOpts, maxAge: 0 });
  return { state, codeVerifier, next };
}

/** Reject anything that isn't a relative same-origin path so we can't be
 *  used as an open redirector. */
export function safeNext(input: string | null | undefined): string {
  if (!input) return "/";
  if (!input.startsWith("/") || input.startsWith("//")) return "/";
  return input;
}

export { generateState };
