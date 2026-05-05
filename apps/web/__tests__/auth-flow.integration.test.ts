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

import { CookieJar, api, assertServerRunning, uniqueEmail } from "./helpers";

beforeAll(async () => {
  await assertServerRunning();
});

// ---------------------------------------------------------------------------
// Web cookie session: signup → me → signout → me 401
// ---------------------------------------------------------------------------

describe("web cookie session flow", () => {
  const jar = new CookieJar();
  const email = uniqueEmail("web-cookie");

  it("signup sets the os-session cookie", async () => {
    const res = await api<UserResponse>("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password: "password123", name: "Web Tester" }),
      jar,
    });
    expect(res.status).toBe(201);
    UserResponseSchema.parse(res.body);
    expect(jar.has("os-session")).toBe(true);
  });

  it("/auth/me returns the new user with the cookie", async () => {
    const res = await api<UserResponse>("/api/v1/auth/me", { jar });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
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
// Mobile bearer flow: mobile/signup → /me with bearer → mobile/refresh
// rotates → old refresh rejected → mobile/logout → refresh rejected
// ---------------------------------------------------------------------------

describe("mobile bearer flow", () => {
  let auth: MobileAuthResponse;

  it("mobile/signup returns access + refresh", async () => {
    const res = await api<MobileAuthResponse>(
      "/api/v1/auth/mobile/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email: uniqueEmail("mobile-bearer"),
          password: "password123",
          name: "Mobile Tester",
        }),
      },
    );
    expect(res.status).toBe(201);
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

    // Old refresh now revoked.
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
// Mutation flow: signup → create draft → publish → like (idempotent) →
// unlike → bookmark → unbookmark → soft-delete (cleanup)
// ---------------------------------------------------------------------------

describe("story mutation flow (bearer)", () => {
  let auth: MobileAuthResponse;
  let slug: string;

  beforeAll(async () => {
    const res = await api<MobileAuthResponse>(
      "/api/v1/auth/mobile/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email: uniqueEmail("mobile-mutate"),
          password: "password123",
          name: "Mutation Tester",
        }),
      },
    );
    auth = MobileAuthResponseSchema.parse(res.body);
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
    // Two reads; views should not change because owner-skip applies.
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
    // Need to be signed in to even reach the publish handler.
    const signup = await api<MobileAuthResponse>(
      "/api/v1/auth/mobile/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email: uniqueEmail("validate"),
          password: "password123",
          name: "Validator",
        }),
      },
    );
    const auth = MobileAuthResponseSchema.parse(signup.body);
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

    // cleanup
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
