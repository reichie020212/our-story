# Project notes for Claude

OurStory — Next.js 15 + Prisma 7 + Neon Postgres web backend in `apps/web/`, Expo SDK 54 + Expo Router 6 mobile client in `apps/mobile/`, shared Zod contract in `packages/api-types/`. pnpm workspaces.

This file supplements the global `~/.claude/CLAUDE.md` with OurStory-specific conventions. The global file's rules (sign every commit `-s -S`, no co-author trailer, conventional commits, etc.) still apply.

## Roles

Per the global "Division of Labor" — for OurStory project work, **Gemini is the Architect** and **Claude is the Executor**. Concretely:

- **Gemini** owns schema design, migration shape, library/framework choices, and any non-trivial architectural pivot. Consult via `/ask gemini` (and end the turn — see Async Guardrail in global CLAUDE.md). See `GEMINI.md` for what context Gemini already has.
- **Claude** writes the code, runs the tooling, commits. Follows blueprints from Gemini exactly. If a blueprint contradicts existing code or hits a blocker, re-consult — don't improvise schema or architecture changes alone.

Past sessions have asked Gemini for a Blueprint before: the FTS swap (commit `0aef4de`), the monorepo restructure (`840a95f`), and the mobile UI architecture (`515b89d`/`fd5afba`). Each came back as "approve with these tweaks" and the executor delegated the actual writing.

## Repo layout (load-bearing)

```
apps/web/                Next.js — pages + /api/v1/* + Prisma + .env
apps/mobile/             Expo / RN — talks to /api/v1/* over Bearer
packages/api-types/      Shared Zod schemas + inferred TS types — single source of truth for the wire format
package.json             pnpm workspaces root, only convenience scripts
pnpm-workspace.yaml      apps/* + packages/*
.npmrc                   node-linker=hoisted (Metro plays nicer flat than with pnpm symlinks)
DEPLOYMENT.md            Vercel deploy checklist
ARCHITECTURE.md          Backend handler + auth + rate-limit overview
README.md                Repo overview + getting-started
```

When adding a new endpoint: schema goes in `packages/api-types/src/index.ts` first, then both web (handler) and mobile (fetcher) consume from there. Server doesn't validate its own outgoing responses against the schema at runtime — TS types alone are enough. Mobile DOES validate via Zod parse in the fetcher.

## Common commands

| What | Command |
|---|---|
| Install | `pnpm install` |
| Web dev | `pnpm dev` (web only — mobile is `pnpm mobile start`) |
| Web build | `pnpm build` |
| Typecheck all | `pnpm typecheck` |
| Lint all | `pnpm lint` |
| Web contract tests | `pnpm web test` |
| Web integration tests | `pnpm dev` in one terminal, `pnpm web test:integration` in another |
| Migrate (against env's `DATABASE_URL_DIRECT`) | `pnpm db:migrate` |
| Seed | `pnpm db:seed` |
| Mobile dev | `pnpm mobile start` (Expo dev tools / QR) |

Pass-through: `pnpm web <script>` and `pnpm mobile <script>` run scripts inside the respective workspace.

## Workflow rules specific to this project

- **No worktrees**: Red has explicitly opted out for OurStory (memory: `feedback_worktree_usage`). Work directly on whichever branch is checked out. Do not auto-create a worktree even though the global CLAUDE.md mandates it.
- **Don't commit unless asked**: standard rule. Same for `git push`.
- **Don't drive Vercel**: deploy is Red's hands. `DEPLOYMENT.md` is the checklist.
- **`.env` lives in `apps/web/`** (not the repo root). Next.js loads it relative to its project root.
- **Test data pollution is OK**: integration tests hit the real Neon dev branch. They use `uniqueEmail()` to avoid collisions and soft-delete created stories. Don't try to fully isolate — a Postgres test container would be a separate hardening pass that hasn't happened yet.

## Pre-commit checklist

Before committing, run:
```bash
pnpm lint && pnpm typecheck && pnpm web test
```

If you touched anything mobile, also: `pnpm --filter @our-story/mobile exec npx expo-doctor`.

If you touched the auth surface or a route handler, also boot `pnpm dev` and run `pnpm web test:integration`.

## Wire-format contract notes

- `StoryWire`'s `liked` and `bookmarked` fields are **optional** and **only populated** on single-story GET when the caller is signed in. List endpoints do not include them.
- `StoryListResponse` (cursored) is for `/api/v1/stories`. Featured / trending / `/me/stories` / `/me/bookmarks` use the simpler `StoryListNoCursorResponseSchema`.
- Mobile auth responses (`/auth/mobile/login`, `/auth/mobile/signup`, `/auth/mobile/refresh`) all share `MobileAuthResponseSchema` — `user` + `accessToken` + `accessTokenExpiresAt` + `refreshToken` + `refreshTokenExpiresAt`.
- Error envelope: `{ error: { code, message, issues? } }`. `code` is a stable string the client switches on; `message` is human-readable.

## Things to avoid
- Don't add image features (covers, inline images). Image-free is a load-bearing v1 decision; the schema is shaped to allow image blocks back in without a migration but the UI / endpoints are not.
- Don't add a composer to mobile. Web-only by product decision. The reader is mobile-only.
- Don't switch off pnpm. `package-lock.json` is gone; if you see one, something went wrong. Vercel uses pnpm via the `packageManager` field.
- Don't run `prisma generate` inside `apps/mobile` — Prisma is web-only.
