/**
 * Integration tests for the auth + mutation flows that the contract
 * suite can't reach in-process (because Next's `cookies()` and
 * `headers()` only exist inside a real request lifecycle).
 *
 * Setup: this suite assumes a dev server is running on
 * TEST_BASE_URL (default http://localhost:3000). Run:
 *
 *     # terminal 1
 *     pnpm dev
 *
 *     # terminal 2
 *     pnpm web test:integration
 *
 * Tests use unique per-run emails so re-runs don't 409 on duplicate
 * accounts. Created stories are soft-deleted at the end of their
 * test to keep the dev DB tidy.
 *
 * Email verification is a HARD gate on signin. Tests that exercise
 * downstream flows (story mutations etc.) call `markEmailVerified`
 * to short-circuit the ceremony; the verification flow itself is
 * exercised explicitly in its own describe block.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  MobileAuthResponseSchema,
  StoryResponseSchema,
  UserResponseSchema,
  type MobileAuthResponse,
  type StoryResponse,
  type UserResponse,
} from "@our-story/api-types";

import {
  CookieJar,
  api,
  assertServerRunning,
  expireVerificationTokens,
  isEmailVerified,
  issueRawVerificationToken,
  markEmailVerified,
  uniqueEmail,
} from "./helpers";

beforeAll(async () => {
  await assertServerRunning();
});

// ---------------------------------------------------------------------------
// Web cookie session: signup is now verification-gated.
//   Signup → "verification required" + no cookie → mark verified →
//   signin → cookie set → /me → signout → /me 401.
// ---------------------------------------------------------------------------

describe("web cookie session flow", () => {
  const jar = new CookieJar();
  const email = uniqueEmail("web-cookie");

  it("signup returns verificationRequired and does NOT set a session", async () => {
    const res = await api<{
      user: { email: string };
      verificationRequired: true;
    }>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "password123",
        name: "Web Tester",
      }),
      jar,
    });
    expect(res.status).toBe(201);
    expect(res.body.verificationRequired).toBe(true);
    expect(res.body.user.email).toBe(email);
    expect(jar.has("os-session")).toBe(false);
    expect(await isEmailVerified(email)).toBe(false);
  });

  it("signin against unverified account is 403 email_not_verified", async () => {
    const res = await api<{ error: { code: string; email?: string } }>(
      "/api/v1/auth/signin",
      {
        method: "POST",
        body: JSON.stringify({ email, password: "password123" }),
        jar,
      },
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("email_not_verified");
    expect(res.body.error.email).toBe(email);
    expect(jar.has("os-session")).toBe(false);
  });

  it("after verification, signin sets the cookie + /me returns the user", async () => {
    await markEmailVerified(email);
    const signin = await api<UserResponse>("/api/v1/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password: "password123" }),
      jar,
    });
    expect(signin.status).toBe(200);
    UserResponseSchema.parse(signin.body);
    expect(jar.has("os-session")).toBe(true);

    const me = await api<UserResponse>("/api/v1/auth/me", { jar });
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it("/auth/me without the cookie is 401", async () => {
    const res = await api("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("signout clears the cookie + subsequent /me is 401", async () => {
    const out = await api("/api/v1/auth/signout", { method: "POST", jar });
    expect(out.status).toBe(200);
    expect(jar.has("os-session")).toBe(false);
    const me = await api("/api/v1/auth/me", { jar });
    expect(me.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Email verification: the actual happy + sad paths of the link flow.
// ---------------------------------------------------------------------------

describe("email verification flow", () => {
  it("verify-email with a fresh token sets emailVerifiedAt + opens a session", async () => {
    const email = uniqueEmail("verify-happy");
    const signup = await api("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "password123",
        name: "Verifier",
      }),
    });
    expect(signup.status).toBe(201);
    expect(await isEmailVerified(email)).toBe(false);

    const { token } = await issueRawVerificationToken(email);
    const jar = new CookieJar();
    const res = await api<UserResponse>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
      jar,
    });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(jar.has("os-session")).toBe(true);
    expect(await isEmailVerified(email)).toBe(true);
  });

  it("verify-email twice rejects the second call as 'used'", async () => {
    const email = uniqueEmail("verify-reuse");
    await api("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "password123",
        name: "Reuser",
      }),
    });
    const { token } = await issueRawVerificationToken(email);

    const first = await api("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    expect(first.status).toBe(200);

    const second = await api<{ error: { code: string } }>(
      "/api/v1/auth/verify-email",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
    );
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("verification_used");
  });

  it("verify-email with a bogus token is verification_invalid", async () => {
    const res = await api<{ error: { code: string } }>(
      "/api/v1/auth/verify-email",
      {
        method: "POST",
        body: JSON.stringify({
          token: "this-is-not-a-real-token-but-is-long-enough",
        }),
      },
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("verification_invalid");
  });

  it("verify-email with an expired token is verification_expired", async () => {
    const email = uniqueEmail("verify-expired");
    await api("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "password123",
        name: "Slowpoke",
      }),
    });
    const { token } = await issueRawVerificationToken(email);
    await expireVerificationTokens(email);

    const res = await api<{ error: { code: string } }>(
      "/api/v1/auth/verify-email",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("verification_expired");
  });

  it("resend-verification always returns 200 (doesn't leak existence)", async () => {
    const unknown = await api("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: uniqueEmail("nobody-home") }),
    });
    expect(unknown.status).toBe(200);

    const email = uniqueEmail("resend");
    await api("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password: "password123", name: "Re" }),
    });
    const known = await api("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    expect(known.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Mobile bearer flow: mobile/signup → verification gate → mark verified →
// mobile/login → /me with bearer → mobile/refresh → mobile/logout.
// ---------------------------------------------------------------------------

describe("mobile bearer flow", () => {
  const email = uniqueEmail("mobile-bearer");
  let auth: MobileAuthResponse;

  it("mobile/signup returns verificationRequired and NO tokens", async () => {
    const res = await api<{
      user: { email: string };
      verificationRequired: true;
    }>("/api/v1/auth/mobile/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "password123",
        name: "Mobile Tester",
      }),
    });
    expect(res.status).toBe(201);
    expect(res.body.verificationRequired).toBe(true);
    expect((res.body as Record<string, unknown>).accessToken).toBeUndefined();
  });

  it("mobile/login on unverified account is 403 email_not_verified", async () => {
    const res = await api<{ error: { code: string } }>(
      "/api/v1/auth/mobile/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password: "password123" }),
      },
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("email_not_verified");
  });

  it("mobile/login after verification returns access + refresh", async () => {
    await markEmailVerified(email);
    const res = await api<MobileAuthResponse>("/api/v1/auth/mobile/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "password123" }),
    });
    expect(res.status).toBe(200);
    auth = MobileAuthResponseSchema.parse(res.body);
  });

  it("/auth/me with bearer returns the same user", async () => {
    const res = await api<UserResponse>("/api/v1/auth/me", {
      bearer: auth.accessToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(auth.user.id);
  });

  it("/auth/me with a bogus bearer is 401", async () => {
    const res = await api("/api/v1/auth/me", { bearer: "not.a.real.jwt" });
    expect(res.status).toBe(401);
  });

  it("refresh rotates both tokens; the old refresh is then rejected", async () => {
    const r = await api<MobileAuthResponse>("/api/v1/auth/mobile/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    expect(r.status).toBe(200);
    const next = MobileAuthResponseSchema.parse(r.body);
    expect(next.refreshToken).not.toBe(auth.refreshToken);
    expect(next.accessToken).not.toBe(auth.accessToken);

    const reuse = await api("/api/v1/auth/mobile/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    expect(reuse.status).toBe(401);

    auth = next;
  });

  it("logout revokes the current refresh", async () => {
    const out = await api("/api/v1/auth/mobile/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    expect(out.status).toBe(200);

    const reuse = await api("/api/v1/auth/mobile/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    expect(reuse.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Mutation flow: signup → mark verified → mobile login → create draft →
// publish → like (idempotent) → unlike → bookmark → unbookmark → soft-delete.
// ---------------------------------------------------------------------------

describe("story mutation flow (bearer)", () => {
  let auth: MobileAuthResponse;
  let slug: string;
  const email = uniqueEmail("mobile-mutate");

  beforeAll(async () => {
    const signup = await api("/api/v1/auth/mobile/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "password123",
        name: "Mutation Tester",
      }),
    });
    expect(signup.status).toBe(201);
    await markEmailVerified(email);
    const login = await api<MobileAuthResponse>(
      "/api/v1/auth/mobile/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password: "password123" }),
      },
    );
    auth = MobileAuthResponseSchema.parse(login.body);
  });

  it("create draft", async () => {
    const res = await api<StoryResponse>("/api/v1/stories", {
      method: "POST",
      bearer: auth.accessToken,
      body: JSON.stringify({
        title: `Integration test ${Date.now()}`,
        synopsis: "An integration test story.",
        body: ["Paragraph one.", "Paragraph two."],
      }),
    });
    expect(res.status).toBe(201);
    const parsed = StoryResponseSchema.parse(res.body);
    expect(parsed.story.status).toBe("draft");
    slug = parsed.story.slug;
  });

  it("publish", async () => {
    const res = await api<StoryResponse>(
      `/api/v1/stories/${slug}/publish`,
      { method: "POST", bearer: auth.accessToken },
    );
    expect(res.status).toBe(200);
    expect(StoryResponseSchema.parse(res.body).story.status).toBe("published");
  });

  it("like is idempotent — second POST keeps count at 1", async () => {
    const a = await api<{ liked: boolean; likeCount: number }>(
      `/api/v1/stories/${slug}/like`,
      { method: "POST", bearer: auth.accessToken },
    );
    expect(a.body).toEqual({ liked: true, likeCount: 1 });
    const b = await api<{ liked: boolean; likeCount: number }>(
      `/api/v1/stories/${slug}/like`,
      { method: "POST", bearer: auth.accessToken },
    );
    expect(b.body).toEqual({ liked: true, likeCount: 1 });
  });

  it("unlike returns count=0", async () => {
    const res = await api<{ liked: boolean; likeCount: number }>(
      `/api/v1/stories/${slug}/like`,
      { method: "DELETE", bearer: auth.accessToken },
    );
    expect(res.body).toEqual({ liked: false, likeCount: 0 });
  });

  it("bookmark + unbookmark", async () => {
    const a = await api<{ bookmarked: boolean }>(
      `/api/v1/stories/${slug}/bookmark`,
      { method: "POST", bearer: auth.accessToken },
    );
    expect(a.body).toEqual({ bookmarked: true });
    const b = await api<{ bookmarked: boolean }>(
      `/api/v1/stories/${slug}/bookmark`,
      { method: "DELETE", bearer: auth.accessToken },
    );
    expect(b.body).toEqual({ bookmarked: false });
  });

  it("owner reading own story does NOT bump views (owner-skip)", async () => {
    const before = await api<StoryResponse>(`/api/v1/stories/${slug}`, {
      bearer: auth.accessToken,
    });
    const startViews = StoryResponseSchema.parse(before.body).story.views;
    await api(`/api/v1/stories/${slug}`, { bearer: auth.accessToken });
    const after = await api<StoryResponse>(`/api/v1/stories/${slug}`, {
      bearer: auth.accessToken,
    });
    const endViews = StoryResponseSchema.parse(after.body).story.views;
    expect(endViews).toBe(startViews);
  });

  afterAll(async () => {
    if (slug && auth) {
      await api(`/api/v1/stories/${slug}`, {
        method: "DELETE",
        bearer: auth.accessToken,
      }).catch(() => {
        /* best-effort */
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Password change: verifies-current → revokes-other-sessions → keeps-current.
// ---------------------------------------------------------------------------

describe("password change", () => {
  const email = uniqueEmail("pwchange");
  const oldPassword = "password123";
  const newPassword = "newpassword456";
  const jarA = new CookieJar(); // session that submits the change
  const jarB = new CookieJar(); // another session that should get revoked
  let mobile: MobileAuthResponse;

  beforeAll(async () => {
    const signup = await api("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: oldPassword,
        name: "Pw Tester",
      }),
    });
    expect(signup.status).toBe(201);
    await markEmailVerified(email);

    // Two web sessions + one mobile token bundle, so we can verify the
    // password change kicks out the others but keeps jarA alive.
    const a = await api("/api/v1/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password: oldPassword }),
      jar: jarA,
    });
    expect(a.status).toBe(200);
    const b = await api("/api/v1/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password: oldPassword }),
      jar: jarB,
    });
    expect(b.status).toBe(200);
    const m = await api<MobileAuthResponse>("/api/v1/auth/mobile/login", {
      method: "POST",
      body: JSON.stringify({ email, password: oldPassword }),
    });
    mobile = MobileAuthResponseSchema.parse(m.body);
  });

  it("rejects wrong current password", async () => {
    const res = await api<{ error: { code: string } }>(
      "/api/v1/me/password",
      {
        method: "PATCH",
        jar: jarA,
        body: JSON.stringify({
          currentPassword: "totallywrong",
          newPassword,
        }),
      },
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("wrong_password");
  });

  it("rejects new password identical to current", async () => {
    const res = await api<{ error: { code: string } }>(
      "/api/v1/me/password",
      {
        method: "PATCH",
        jar: jarA,
        body: JSON.stringify({
          currentPassword: oldPassword,
          newPassword: oldPassword,
        }),
      },
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("same_password");
  });

  it("succeeds with correct current password", async () => {
    const res = await api<{ ok: true }>("/api/v1/me/password", {
      method: "PATCH",
      jar: jarA,
      body: JSON.stringify({
        currentPassword: oldPassword,
        newPassword,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("current session (jarA) stays alive after change", async () => {
    const me = await api<UserResponse>("/api/v1/auth/me", { jar: jarA });
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });

  it("other sessions (jarB) are revoked", async () => {
    const me = await api("/api/v1/auth/me", { jar: jarB });
    expect(me.status).toBe(401);
  });

  it("mobile refresh tokens are revoked", async () => {
    const res = await api("/api/v1/auth/mobile/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: mobile.refreshToken }),
    });
    expect(res.status).toBe(401);
  });

  it("signin with old password is rejected", async () => {
    const res = await api("/api/v1/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password: oldPassword }),
    });
    expect(res.status).toBe(401);
  });

  it("signin with new password works", async () => {
    const jar = new CookieJar();
    const res = await api("/api/v1/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password: newPassword }),
      jar,
    });
    expect(res.status).toBe(200);
    expect(jar.has("os-session")).toBe(true);
  });

  it("password change requires auth", async () => {
    const res = await api("/api/v1/me/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: oldPassword,
        newPassword,
      }),
    });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Validation surface — guard rails on the boundaries we care about
// ---------------------------------------------------------------------------

describe("validation rejections", () => {
  it("signup with short password is 400", async () => {
    const res = await api("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: uniqueEmail("short-pw"),
        password: "short",
        name: "x",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("publish with no synopsis is 422 missing_synopsis", async () => {
    const email = uniqueEmail("validate");
    const signup = await api("/api/v1/auth/mobile/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "password123",
        name: "Validator",
      }),
    });
    expect(signup.status).toBe(201);
    await markEmailVerified(email);
    const login = await api<MobileAuthResponse>(
      "/api/v1/auth/mobile/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password: "password123" }),
      },
    );
    const auth = MobileAuthResponseSchema.parse(login.body);
    const draft = await api<StoryResponse>("/api/v1/stories", {
      method: "POST",
      bearer: auth.accessToken,
      body: JSON.stringify({ title: "No synopsis here" }),
    });
    const slug = StoryResponseSchema.parse(draft.body).story.slug;

    const pub = await api<{ error: { code: string } }>(
      `/api/v1/stories/${slug}/publish`,
      { method: "POST", bearer: auth.accessToken },
    );
    expect(pub.status).toBe(422);
    expect(pub.body.error.code).toBe("missing_synopsis");

    await api(`/api/v1/stories/${slug}`, {
      method: "DELETE",
      bearer: auth.accessToken,
    }).catch(() => {});
  });

  it("create story without auth is 401", async () => {
    const res = await api("/api/v1/stories", {
      method: "POST",
      body: JSON.stringify({ title: "nope" }),
    });
    expect(res.status).toBe(401);
  });
});
