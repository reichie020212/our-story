# OurStory architecture

This is a working note, not exhaustive docs. Point of view: a developer who just opened the repo and wants to know how it fits together before changing anything.

## One repo, two surfaces

```
                             ┌─────────────────────────┐
   Web reader / writer ──────▶          Vercel          ◀──── Mobile (RN/Expo, Part II)
        (cookie session)     │                          │      (RS256 JWT + refresh)
                             │   Next.js 15 App Router  │
                             │                          │
                             │  app/* (UI)              │
                             │  app/api/v1/* (handlers) │
                             │  lib/* (helpers)         │
                             └────┬───────────┬─────────┘
                                  │           │
                       Neon Postgres        Upstash Redis
                       (Prisma 7 +          (rate limit only;
                        adapter-pg pool)     optional, no-op
                                             fallback)
```

The same handlers serve both surfaces. The only difference is **how** the caller proves identity:

- **Web**: `os-session` HTTP-only cookie (id of a `Session` row, sliding 30-day TTL).
- **Mobile**: `Authorization: Bearer <RS256 JWT>` for reads/writes, `POST /api/v1/auth/mobile/refresh` to roll the access token using an opaque refresh token (sha256-hashed at rest in `mobile_refresh_tokens`).

Both resolve to the same `users` row.

## Schema

`prisma/schema.prisma` is the source of truth; the SQL is in `prisma/migrations/`. The shape (image-free v1):

- `users` — id, email, password_hash (nullable for OAuth-only), name, handle (unique), initial, oauth_provider/id, timestamps.
- `sessions` — id, user_id, expires_at. Web sessions only.
- `mobile_refresh_tokens` — token_hash (sha256), user_id, expires_at, revoked_at. Mobile refresh tokens only.
- `stories` — id, slug (unique), author_id, title, synopsis, body (JSONB; v1 = `string[]`, kept as JSON so an image-block return won't migrate), genre/length/status enums, tags TEXT[], featured bool, published_at, minutes, view_count, like_count, deleted_at (soft delete).
- `likes`, `bookmarks` — composite PK (user_id, story_id).
- `views` — id, story_id, session_hash (sha256(ip + ua + day_bucket)), viewed_at. Unique on (story_id, session_hash) gives 24h dedup for free.

Indexes follow the access patterns: list endpoint filters by genre / status+publishedAt / featured, cursor pagination uses (orderBy, id desc) for stable ordering, soft-delete has its own index because every public list filters `deleted_at IS NULL`.

Featured invariant ("at most one") is enforced in the seed and (eventually) in the publish path — not at the DB level, since the brief calls for an admin-only flip.

## API surface

All under `/api/v1`. Public routes are anonymous-friendly; auth'd routes require either a cookie (web) or a Bearer token (mobile, once `lib/jwt.ts#verifyAccessToken` is plumbed into a guard for the mobile-only routes).

### Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/signup` | email + password + name → cookie session, 5/min/IP |
| POST | `/auth/signin` | email + password → cookie session, 5/min/IP |
| POST | `/auth/signout` | clears session |
| GET | `/auth/me` | current user or 401 |
| GET | `/auth/oauth/[provider]/start` | Google / GitHub, sets state + PKCE cookies, 302s to provider |
| GET | `/auth/oauth/[provider]/callback` | exchange + link-by-email or create, starts session |
| POST | `/auth/mobile/login` | email + password → access (RS256, 15min) + refresh (opaque, 30d) |
| POST | `/auth/mobile/refresh` | refresh → new access + new refresh (rotate-on-use) |
| POST | `/auth/mobile/logout` | revoke a presented refresh token |

### Stories

| Method | Path | Notes |
|---|---|---|
| GET | `/stories` | filter: genre / length / tag / q / sort, cursor pagination, public+published only |
| POST | `/stories` | create draft, owner=current user, 10/min/user |
| GET | `/stories/[idOrSlug]` | single read; counts a view (per-session) when not the owner |
| PATCH | `/stories/[idOrSlug]` | owner-only update, 10/min/user |
| POST | `/stories/[idOrSlug]/publish` | owner-only, validates title / synopsis / body |
| DELETE | `/stories/[idOrSlug]` | owner-only soft delete |
| GET | `/stories/featured` | the one featured + published story |
| GET | `/stories/trending` | top-N by view count (all-time for v1) |
| POST/DELETE | `/stories/[idOrSlug]/like` | toggle, returns `{ liked, likeCount }`, 60/min/session |
| POST/DELETE | `/stories/[idOrSlug]/bookmark` | toggle, 60/min/session |

### Misc

| Method | Path | Notes |
|---|---|---|
| GET | `/me/stories` | own stories, all statuses except soft-deleted |
| GET | `/me/bookmarks` | bookmarked stories, newest first |
| GET | `/tags/trending` | tag tally across published, non-deleted stories |

Search currently uses ILIKE on title / synopsis / tags / author name. Once the library outgrows that, swap for a tsvector + GIN index — that's the upgrade path, not a rewrite.

## Auth choice notes

The original plan called for **Lucia v3** for web sessions and **Auth.js / Lucia OAuth** for OAuth. Both were dropped during build:
- Lucia v3 is upstream-retired (and `@lucia-auth/adapter-prisma` only peers against Prisma 4–5; we're on Prisma 7). Replaced with ~150 lines of hand-rolled session helpers in `lib/auth.ts` + `lib/session.ts` that match Lucia's surface (`createSession`, `validateSession`, `invalidateSession`, sliding renewal).
- Auth.js / Lucia OAuth are in the same boat. Replaced with `arctic`, the actively-maintained primitive Lucia's author now points users to. Provider clients live in `lib/oauth.ts`, with state + PKCE in 10-min HTTP-only cookies.

Both deviations live in `~/.claude/projects/-Users-red-our-story/memory/project_ourstory_backend_decisions.md` so they aren't lost across sessions.

## Rate limits

`lib/ratelimit.ts#getLimiter(bucket, max, window)` is a sliding-window limiter backed by Upstash REST. When `UPSTASH_REDIS_REST_URL` is unset it returns a no-op, so dev without Upstash works. Production behavior:

| Bucket | Limit | Keyed by |
|---|---|---|
| `auth` | 5 / min | client IP — signin / signup / oauth-start |
| `auth` | 30 / min | client IP — mobile refresh |
| `write` | 10 / min | user id — create / patch / publish / delete story |
| `engage` | 60 / min | session-or-IP — like + bookmark |
| `view` | 30 / min | session-or-IP — view counter (story still returns when blocked, only the counter pauses) |

`session-or-IP` means: prefer the session cookie if signed in; fall back to sha256(ip + ua) for anonymous traffic. View dedup is independent of the rate limiter — it uses sha256(ip + ua + dayBucket) and the `views.story_id+session_hash` unique index.

## Deployment

Vercel Hobby tier, Neon Hobby tier, Upstash free tier — that's the v1 cost ceiling. Prisma 7 needs the pg driver adapter (`@prisma/adapter-pg`) on the runtime client; that's already wired in `lib/db.ts`.

Build doesn't need any of these env vars (the db client is constructed lazily via Proxy, and the OAuth/JWT/Upstash clients all return graceful 503s when keys are missing). That means CI can build the app green without touching Neon.
