# OurStory

A quiet library for writers who'd rather be read than reposted. Independent, ad-supported, no algorithm.

This is a **pnpm workspaces** monorepo with two surfaces — the Next.js web app (Part I) and the Expo/React Native mobile companion (Part II) — sharing a wire-format contract.

## Layout

```
our-story/
  apps/
    web/                       # Next.js 15 App Router — pages + /api/v1/* + Prisma
    mobile/                    # Expo / React Native (Expo Router) — Part II
  packages/
    api-types/                 # Shared Zod schemas + inferred TS types for the
                               # /api/v1/* wire format. Single source of truth
                               # so server changes ripple to mobile via tsc.
  package.json                 # Workspaces root — only convenience scripts
  pnpm-workspace.yaml          # apps/* + packages/*
  .npmrc                       # node-linker=hoisted (Metro plays nicer flat)
```

## Stack

**Web (`apps/web`)**
- Next.js 15 App Router + TypeScript strict
- Prisma 7 + Neon Postgres (adapter-pg pool) — schema in `apps/web/prisma/schema.prisma`
- argon2id passwords, HTTP-only cookie sessions for web, RS256 JWT + opaque refresh tokens for mobile
- Upstash Redis sliding-window rate limit (no-op fallback when env vars blank)
- arctic for Google + GitHub OAuth
- Zod input validation at every route boundary
- next/font for Fraunces / Inter / JetBrains Mono

**Mobile (`apps/mobile`)** — Expo SDK with Expo Router (file-based, mirrors Next App Router). Talks to `/api/v1/*` via Bearer-token auth (RS256 access + opaque refresh), validating responses with the shared `@our-story/api-types` schemas.

The original HTML/React prototype lives in `apps/web/OurStory.html`, `apps/web/app.jsx`, `apps/web/components/*.jsx`, `apps/web/data/stories.jsx` for design reference; excluded from TS/ESLint, not loaded at runtime.

## Getting started

```bash
# 1. Install everything (pnpm hoists into a single root node_modules)
pnpm install

# 2. Provision Neon — create a project, copy pooled + direct URLs
cp apps/web/.env.example apps/web/.env
# fill DATABASE_URL, DATABASE_URL_DIRECT, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY

# 3. Migrate + seed (creates mara@ourstory.test / password123 + 10 stories)
pnpm db:migrate
pnpm db:seed

# 4. Run web
pnpm dev                      # → http://localhost:3000

# 5. Run mobile
pnpm mobile start             # → Expo dev tools, scan QR with Expo Go
# For physical devices: EXPO_PUBLIC_API_BASE_URL=http://<lan-ip>:3000 pnpm mobile start
```

For the full walkthrough — JWT key generation, the superadmin, local email testing with Mailpit, and troubleshooting — see **`DEVELOPMENT.md`**.

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | Web dev server (Next + Turbopack) |
| `pnpm build` | Production build of the web app |
| `pnpm lint` | ESLint across all workspaces |
| `pnpm typecheck` | `tsc --noEmit` across all workspaces |
| `pnpm web test` | Vitest contract suite — fast, in-process |
| `pnpm web test:integration` | Vitest integration suite — needs `pnpm dev` running in another terminal |
| `pnpm db:migrate` | `prisma migrate deploy` against `DATABASE_URL_DIRECT` |
| `pnpm db:seed` | Idempotent seed |
| `pnpm mobile start` | Expo dev tools (QR + simulator launchers) |
| `pnpm web <script>` | Pass-through to the web app's package.json scripts |
| `pnpm mobile <script>` | Pass-through to the mobile app's package.json scripts |

## Status

**Part I — Web backend: feature-complete and verified.**
- Prototype → App Router conversion
- Prisma schema + migrations + idempotent seed
- Web auth: cookie sessions + signup / signin / signout / me + OAuth (Google + GitHub via arctic)
- Stories CRUD, me/stories, me/bookmarks
- Browse: list / featured / trending / tags trending
- Engagement: likes / bookmarks / view dedup + Upstash rate limit
- Frontend wiring: Browse / Reader / Composer talk to the API
- Mobile auth: RS256 access + opaque refresh, dedicated `/auth/mobile/{login,signup,refresh,logout}` routes; Bearer guard wired into every protected route
- Search: tsvector + GIN with weighted ranking, `websearch_to_tsquery` parser, IMMUTABLE wrapper function
- Tests: 9 contract + 18 integration (auth + mutation + validation flows)

**Part II — Mobile client: feature-complete for v1.** See `apps/mobile/README.md` for layout + auth boot sequence + how to add a screen / query / mutation.
- Sign-in / sign-up / sign-out flow with redirect-on-state
- Browse: search + trending tag chips + featured banner + infinite scroll
- Reader: paragraph rendering with optimistic like + bookmark
- Bookmarks tab + Me tab (own drafts + published)
- Token storage in OS keychain via `expo-secure-store`, single-flight refresh on 401

**Out of scope for v1** (deferred by product decision):
- Composer-on-mobile (web-only)
- OAuth on mobile (would need WebView + `ourstory://` redirect)
- Image features (covers, inline blocks, lightbox) — `Story.body` is kept as JSON `string[]` so a future image-block return doesn't migrate.
- Push notifications, comments, follows.

## API surface

See `ARCHITECTURE.md` for the full list and rate limits, and `packages/api-types` for the typed wire format.

## Deployment

`DEPLOYMENT.md` has the Vercel checklist (root directory = `apps/web`, env vars, `vercel-build` script, OAuth callbacks, mobile `EXPO_PUBLIC_API_BASE_URL` wiring).

## Contributing

Conventional Commits, signed (`-s -S`), no co-author trailer. Don't auto-create git worktrees on this repo. Pre-commit:

```bash
pnpm lint && pnpm typecheck && pnpm web test && pnpm build
```

If you touched the auth surface or a route handler, also run `pnpm web test:integration` (with `pnpm dev` going in another terminal).

`CLAUDE.md` and `GEMINI.md` document the AI-assisted workflow conventions for this repo.
