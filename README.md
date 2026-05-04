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

# 5. Run mobile (once apps/mobile is scaffolded)
pnpm mobile run start         # → Expo dev tools
```

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | Web dev server (Next + Turbopack) |
| `pnpm build` | Production build of the web app |
| `pnpm lint` | ESLint across all workspaces |
| `pnpm typecheck` | `tsc --noEmit` across all workspaces |
| `pnpm db:migrate` | `prisma migrate deploy` against `DATABASE_URL_DIRECT` |
| `pnpm db:seed` | Idempotent seed |
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
- Mobile auth: RS256 access + opaque refresh, Bearer guard wired into all `/api/v1/*` protected routes
- Search: tsvector + GIN with weighted ranking and websearch parser

**Part II — Mobile client: scaffolded, in progress.** See `apps/mobile/README.md` once it lands.

Image features (covers, inline blocks, lightbox) are intentionally out of v1 — see `apps/web/prisma/schema.prisma` for the schema-level breadcrumbs (`Story.body` kept as JSON `string[]` so a future image-block return doesn't migrate).

## API surface

See `ARCHITECTURE.md` for the full list and rate limits, and `packages/api-types` for the typed wire format.

## Contributing

Conventional Commits, signed (`-s -S`). Don't auto-create git worktrees on this repo. Run `pnpm lint && pnpm typecheck && pnpm build` before committing.
