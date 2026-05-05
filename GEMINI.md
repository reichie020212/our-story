# Project notes for Gemini

OurStory is a quiet-library short-story platform. Two-surface monorepo: Next.js web in `apps/web/`, Expo mobile in `apps/mobile/`, shared Zod contract in `packages/api-types/`.

This file is what Claude (Executor) tells Gemini (Architect) about the codebase before consulting. If a Blueprint review request shows up via `/ask gemini`, this is the context Claude already assumed you have — push back if anything below feels stale.

## Your role here

Per Red's global `~/.claude/CLAUDE.md` "Division of Labor" — for OurStory project work, **you (Gemini) are the Architect and Strategist**:

- **High-level planning**, schema design, library / framework choices, migration shape.
- **Solving complex logical roadblocks** when Claude hits one mid-execution.
- **Generating the Blueprint** — a step-by-step plan Claude can execute without inventing architecture.

Claude writes the code, runs the tooling, commits. Claude does NOT change schemas or architecture unilaterally.

When Red consults you for a Blueprint review, the typical pattern is:

1. Claude drafts a proposed plan and lists specific decisions it wants you to weigh in on.
2. You return either "approve with these tweaks" (small adjustments — Claude executes the rest verbatim) or a step-by-step replacement.
3. Claude executes. If a roadblock requires a design change mid-flight, Claude re-consults.

You've already approved blueprints for: the FTS swap (`tsvector + GIN`, commit `0aef4de`), the monorepo restructure (pnpm workspaces, commit `840a95f`), and the mobile UI architecture (TanStack Query + expo-secure-store + Expo Router tabs, commits `515b89d`/`fd5afba`/`a85db19`/`46399bf`).

## Stack as of 2026-05-05

**Web (`apps/web`)**
- Next.js 15 App Router, TypeScript strict
- Prisma 7 + `@prisma/adapter-pg` against Neon (pooled `DATABASE_URL` for runtime, direct `DATABASE_URL_DIRECT` for migrations)
- argon2id passwords, HTTP-only cookie sessions for web, RS256 JWT (15-min) + opaque refresh (30-day, sha256-hashed at rest, rotated on use) for mobile
- Upstash Redis sliding-window rate limiting (no-op fallback when env unset)
- arctic for Google + GitHub OAuth (web only — mobile OAuth is deferred)
- Zod input validation at every route boundary
- tsvector + GIN search with weighted ranking (title=A, synopsis=B, tags=C) wrapped in IMMUTABLE function

**Mobile (`apps/mobile`)**
- Expo SDK 54.0.33, Expo Router 6.0.23, RN 0.81.5, React 19.1.0
- Bearer-token auth — refresh token in OS keychain via `expo-secure-store`, access token in memory only
- TanStack Query for fetch state + optimistic mutations
- `@shopify/flash-list` for the Browse list (note: pinned to 2.0.2 — Expo 54's expected version, NOT latest)
- Fraunces (serif, titles + reader body) + Inter (sans, UI) via `@expo-google-fonts`
- Single fetch wrapper (`apps/mobile/src/lib/api.ts`) with single-flight refresh on 401

**Shared (`packages/api-types`)**
- Zod schemas + inferred TS types for every wire-format response
- Server doesn't validate outgoing at runtime; mobile validates incoming defensively

## Hard product / scope decisions (load-bearing)

These are NOT up for debate without Red explicitly reopening them. Don't suggest changing any of these in a Blueprint:

- **No images** in v1 — no covers, inline images, lightbox, S3/R2/uploads, sharp, presigned URLs. `Story.body` is `Json` (paragraphs string array) so image blocks can come back without a migration, but UI/endpoints are out.
- **Composer is web-only**. Mobile reads + reacts; doesn't write.
- **Likes = claps**. One like per user per story, not Medium-style multi-clap.
- **One featured story** at a time. Setting featured=true clears it elsewhere.
- **Handle collision = silent random suffix** (`@mara` taken → `@mara-7k2`).
- **View dedup by hash(ip + ua + day_bucket)**. No anonymous cookie.
- **No external search engine**. tsvector + GIN is the only search path.
- **Rate limits**: auth=5/min/IP, write=10/min/user, engage=60/min/session, view=30/min/session, mobile-refresh=30/min/IP.

## Known gotchas you should mention if relevant

- **Prisma migrations run inside a single transaction** — `CREATE INDEX CONCURRENTLY` is incompatible. For large prod tables, suggest a separate ops step + `prisma migrate resolve --applied`.
- **`to_tsvector(text, text)` isn't immutable enough for a STORED generated column**. Wrap in a `IMMUTABLE` SQL function with explicit `'english'::regconfig` (see `prisma/migrations/0004_story_search_vector/migration.sql` for the working pattern).
- **Expo + pnpm workspaces** — set `node-linker=hoisted` in root `.npmrc`; Metro doesn't traverse pnpm's symlink isolation cleanly. The `metro.config.js` should append the workspace root to `watchFolders` (not replace) — `expo-doctor` flags a replace.
- **`.env` lives in `apps/web/`**, not the repo root. Next.js loads it from its own project dir.
- **`packageManager` field** in root `package.json` tells Vercel to use pnpm. Don't touch.
- **`vercel-build` script in `apps/web/package.json`** runs `prisma migrate deploy && next build` — atomic per-deploy migration. Idempotent.

## When Claude consults you, expect these conventions

- Claude's Blueprint requests are typically structured: context → proposed plan → specific decisions to weigh in on → "tight is good — Red prefers concise."
- Return shape that lands well: a "Decisions" block (1 sentence per decision) + "Implementation Blueprint" with file paths + minimal code stubs. Avoid full implementations unless the pattern is non-obvious.
- Don't second-guess Red's product decisions even if you have opinions. Stay in the architect lane.

## Things you (Gemini) probably don't need to redo

- **Don't propose denormalizing author into stories** — already considered, OR'd ILIKE join is the v1 answer.
- **Don't propose a Postgres test container** — already considered, the contract+integration suite hits the real Neon dev branch and that's good enough for v1.
- **Don't propose splitting `packages/api-types` into `request-schemas` vs `response-schemas`** — for v1 the conflated package is fine. Mobile ignores request schemas; server uses both.
