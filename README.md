# OurStory

A quiet library for writers who'd rather be read than reposted. Independent, ad-supported, no algorithm.

This repo is the **web app** (Part I in the brief). The mobile companion (Part II) is a separate Expo/React Native project that talks to the same backend; the API surface defined here is shared.

## Stack

- **Next.js 15** (App Router, TypeScript strict) — pages and API both live in `app/`.
- **Prisma 7** + **Neon Postgres** — schema in `prisma/schema.prisma`, migrations under `prisma/migrations/`.
- **argon2id** for passwords, **RS256 JWT** + opaque refresh tokens for mobile auth, **HTTP-only cookie sessions** for web.
- **Upstash Redis** for sliding-window rate limits (no-op fallback when env vars are blank).
- **arctic** for Google + GitHub OAuth.
- **Zod** for input validation at every route boundary.
- **next/font** for Fraunces / Inter / JetBrains Mono.

The HTML/React prototype that the design lives in is preserved in `OurStory.html`, `app.jsx`, `components/*.jsx`, `data/stories.jsx` for reference; those files are excluded from TS / ESLint and aren't loaded at runtime.

## Layout

```
app/
  page.tsx                 # Browse (client component, fetches /api/v1/stories)
  s/[slug]/page.tsx        # Reader (server, reads from db; force-dynamic)
  compose/page.tsx         # Composer (gated)
  about-developer/         # Static page
  download/                # Static page
  api/v1/                  # Route handlers — see ARCHITECTURE.md
components/                # Topbar, Footer, Tweaks, AuthProvider, Browse, …
lib/
  db.ts                    # Lazy Prisma client singleton (Proxy-wrapped)
  auth.ts session.ts       # Web session + password helpers
  oauth.ts                 # Google + GitHub via arctic
  jwt.ts                   # Mobile RS256 access + opaque refresh
  ratelimit.ts request.ts  # Upstash limiter + IP / UA / dedup helpers
  story.ts api.ts          # Wire-format serializer + JSON helpers
  client/api.ts            # Browser fetch wrapper used by client components
prisma/
  schema.prisma
  migrations/{0001_init, 0002_story_soft_delete, 0003_mobile_refresh_tokens}/
  seed.ts                  # Idempotent seed
```

## Getting started

1. **Install:**
   ```bash
   npm install
   ```
2. **Provision Neon** — create a project, copy the pooled and direct connection strings.
3. **Copy env:**
   ```bash
   cp .env.example .env
   ```
   Fill in `DATABASE_URL`, `DATABASE_URL_DIRECT`, and (optionally) Upstash + OAuth + JWT keys.
4. **Migrate + seed:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   The seed creates 10 stories, 10 authors (one per byline), and the test login `mara@ourstory.test` / `password123`.
5. **Run:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate deploy` (applies pending migrations) |
| `npm run db:seed` | `tsx prisma/seed.ts` (idempotent) |

## Status

Backend feature-complete through the brief's Part I:
- Prototype → App Router conversion
- Prisma schema + migrations + seed
- Web auth — cookie sessions + signup/signin/signout/me
- Stories CRUD + me/stories
- Browse — list / featured / trending / tags
- Engagement (likes / bookmarks / view dedup) + Upstash rate limit
- OAuth — Google + GitHub via arctic
- Frontend wiring — Browse / Reader / Composer talk to the API
- Mobile auth — RS256 access + opaque refresh tokens

Image features (covers, inline blocks, lightbox) are intentionally out of v1 — see `prisma/schema.prisma` for the schema-level breadcrumbs (Story.body kept as JSON `string[]` so a future image-block return doesn't migrate).

## API surface

See `ARCHITECTURE.md` for the full list and rate limits.

## Contributing

Conventional Commits, signed (`-s -S`). Don't auto-create git worktrees on this repo. Run `npm run lint && npx tsc --noEmit && npm run build` before committing.
