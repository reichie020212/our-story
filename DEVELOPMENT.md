# Local development setup

Follow this top-to-bottom to get **OurStory** running on your machine — the
Next.js web app, the database, local email testing, and the mobile client.

> The `README.md` "Getting started" block is the 60-second quick version. This
> file is the long-form walkthrough with the parts that actually trip people up
> (JWT keys, the superadmin, local email, troubleshooting). It mirrors the
> `DEPLOYMENT.md` ↔ `DEPLOY_VERCEL_NEON.md` split, but for dev.

---

## 0. Prerequisites

- **Node.js ≥ 20** (the repo's `engines` floor). **20 or 22 LTS** is recommended
  so you match what CI/Vercel run; newer usually works but isn't what ships.
- **pnpm 10** — this is a pnpm workspaces monorepo (no `npm`/`yarn`). The version
  is pinned via `packageManager` in the root `package.json`; the easiest way to
  honor it is Corepack:
  ```bash
  corepack enable
  ```
- **openssl** — to generate the JWT signing keys ([§4](#4-generate-the-jwt-keys)).
  Ships with macOS/Linux.
- **Docker** — *optional*, only for local email testing with Mailpit
  ([§8](#8-local-email-testing-mailpit)). Everything else works without it.

---

## 1. Install

```bash
git clone <your-fork-or-remote> our-story
cd our-story
pnpm install      # hoists into a single root node_modules (node-linker=hoisted)
```

---

## 2. Database (Neon)

Dev runs against a **remote Neon Postgres branch** — there's no local Postgres in
this repo, and you don't need one. Prisma talks to it via two connection strings.

1. Create a free project at <https://neon.tech> (or reuse an existing dev branch).
2. From **Connection Details**, copy **two** forms of the connection string:
   - **Pooled** (has `-pooler` in the host) → `DATABASE_URL`
   - **Direct** (no `-pooler`) → `DATABASE_URL_DIRECT` (migrations need this)

> Prefer to stay fully offline? Any local Postgres works too (the app uses
> `@prisma/adapter-pg`). Point both `DATABASE_URL` and `DATABASE_URL_DIRECT` at
> it — but the Neon path matches production and is less setup.

---

## 3. Environment file

The web app reads its env from `apps/web/.env` (not the repo root).

```bash
cp apps/web/.env.example apps/web/.env
```

Then fill in `apps/web/.env`. The dev-relevant vars:

| Variable | For dev | Notes |
|---|---|---|
| `DATABASE_URL` / `DATABASE_URL_DIRECT` | **required** | from [§2](#2-database-neon) |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | **required** | generate in [§4](#4-generate-the-jwt-keys); mobile auth won't boot without them |
| `NEXT_PUBLIC_SITE_URL` | recommended | `http://localhost:3000` (already the default in `.env.example`) |
| `SUPERADMIN_EMAIL` / `_PASSWORD` / `_NAME` | recommended | bootstraps your admin login ([§5](#5-migrate--seed)) |
| `SMTP_HOST` / `SMTP_PORT` | optional | only for Mailpit email testing ([§8](#8-local-email-testing-mailpit)) |
| `RESEND_*`, `UPSTASH_*`, `GOOGLE_*`, `GITHUB_*` | optional | leave blank; each degrades gracefully |

> **Where does each value come from?** `DEPLOY_VERCEL_NEON.md` §4 has a full
> "where to get the value" table (Neon, Resend, Upstash, Google/GitHub OAuth).
> The same sources apply locally.

---

## 4. Generate the JWT keys

Mobile auth signs access tokens with **RS256**, so the app needs an RSA keypair —
even if you only test the web UI, the server boots these at startup.

```bash
openssl genpkey -algorithm RSA -out jwt-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
```

Paste the **full multi-line PEM contents** (including the `-----BEGIN/END-----`
lines) into `apps/web/.env`, each wrapped in double quotes — dotenv parses
multi-line quoted values cleanly. See the commented example in `.env.example`.
These are **dev throwaways** — generate a fresh pair for production.

---

## 5. Migrate & seed

```bash
pnpm db:migrate   # prisma migrate deploy → applies all migrations to your DB
pnpm db:seed      # idempotent: demo authors + 10 stories, + bootstraps the superadmin
```

The seed creates:

- **`mara@ourstory.test` / `password123`** — a seeded **admin**, email pre-verified.
- The **superadmin** from your `SUPERADMIN_*` vars (skipped with a warning if blank;
  you can also run it alone via `pnpm db:ensure-superadmin`).
- 10 demo stories by various authors. Those other authors are **password-less**
  (can't log in) — to get a regular writer account, **sign up through the UI**.

---

## 6. Run the web app

```bash
pnpm dev          # → http://localhost:3000  (Next + Turbopack)
```

> Env vars are read at **server start**. If you edit `apps/web/.env`, restart
> `pnpm dev` for the change to take effect (especially `NEXT_PUBLIC_*`, which are
> inlined at build time).

---

## 7. Test accounts & the approval gate

| Account | Role | How |
|---|---|---|
| `superadmin@ourstory.test` (or your `SUPERADMIN_EMAIL`) | superadmin | from `.env`; password = your `SUPERADMIN_PASSWORD` |
| `mara@ourstory.test` / `password123` | admin | seeded |
| your own signup | writer (user) | sign up in the UI, then verify ([§8](#8-local-email-testing-mailpit)) |

As an admin, the **Admin** menu exposes the approval-gate toggle, the review
queue, and user management. Flip the gate on to exercise the
"send for approval → approve/reject" flow with a writer account.

---

## 8. Local email testing (Mailpit)

Signup sends a verification link. Locally you have two options.

### Option A — capture mail in a real inbox (Mailpit)

[Mailpit](https://github.com/axllent/mailpit) is a local SMTP sink with a web
inbox. Start it (either form works):

```bash
# one-liner, no file needed:
docker run -d --name ourstory-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

…or save this as `docker-compose.yml` in the repo root and `docker compose up -d`
(it's intentionally **not committed** — add it to `.gitignore` if you like):

```yaml
services:
  mailpit:
    image: axllent/mailpit:latest
    container_name: ourstory-mailpit
    restart: unless-stopped
    ports:
      - "1025:1025" # SMTP
      - "8025:8025" # Web inbox
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: "true"
      MP_SMTP_AUTH_ALLOW_INSECURE: "true"
```

Then point the app at it in `apps/web/.env` and **restart `pnpm dev`**:

```bash
SMTP_HOST="localhost"
SMTP_PORT="1025"
```

Sign up → the verification email lands in the inbox at **http://localhost:8025** →
click **Verify email**. Resend, used-link, and expired-link branches all route
there too.

Tear it down when done:

```bash
docker rm -f ourstory-mailpit          # if you used docker run
docker compose down                    # if you used compose (add -v to wipe mail)
```

> Transport priority is **SMTP → Resend → console** (`apps/web/lib/email.ts`).
> SMTP wins whenever `SMTP_HOST` is set, so dev mail never leaks to a real
> provider even if a Resend key is lying around in your `.env`.

### Option B — no container (console fallback)

Leave **both** `SMTP_*` and `RESEND_*` blank. The app then **prints the
verification link to the `pnpm dev` terminal** — copy it into your browser. Zero
setup; fine when you don't care about the rendered email.

---

## 9. Run the mobile app (optional)

```bash
pnpm mobile start     # Expo dev tools; scan the QR with Expo Go
```

Point it at your local API. On a simulator `localhost` works; on a physical
device use your machine's LAN IP:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000 pnpm mobile start
```

See `apps/mobile/README.md` for the app's layout, auth boot sequence, and how to
add a screen / query / mutation. (The composer is web-only by product decision.)

---

## 10. Tests, lint, typecheck

```bash
pnpm lint                    # ESLint, all workspaces
pnpm typecheck               # tsc --noEmit, all workspaces
pnpm web test                # contract suite — fast, in-process (no server)
```

The **integration suite** hits a live server, so start the dev server first:

```bash
# terminal 1
pnpm dev
# terminal 2
pnpm web test:integration
```

Pre-commit gate (also run integration if you touched auth or a route handler):

```bash
pnpm lint && pnpm typecheck && pnpm web test && pnpm build
```

---

## 11. Troubleshooting

- **Port 3000 already in use** — find and stop the stale server:
  ```bash
  lsof -ti tcp:3000 | xargs kill
  ```
- **Signup returns 500 locally** — you set `SMTP_HOST` but nothing is listening
  (Mailpit isn't running). Start Mailpit ([§8](#8-local-email-testing-mailpit)),
  **or** blank the `SMTP_*` vars and restart `pnpm dev` to fall back to the
  console link.
- **Verification email never shows in Mailpit** — usually the dev server wasn't
  **restarted** after editing `.env` (env is read at boot), or `SMTP_HOST` is
  blank while a `RESEND_*` key is set (then mail goes to Resend, not Mailpit).
- **`prisma migrate dev` wants to `DROP INDEX stories_search_vector_idx`** — the
  full-text `search_vector` is a generated `tsvector` column Prisma can't model.
  When authoring a **new** migration, delete the auto-generated
  `DROP INDEX stories_search_vector_idx` and `ALTER COLUMN search_vector DROP
  DEFAULT` lines from the generated SQL before applying (see migration `0004`).
- **Migration drift / "schema is not empty"** — to reset a *dev* branch (⚠️
  destructive — wipes data): `pnpm --filter @our-story/web exec prisma migrate
  reset`, then `pnpm db:seed`. Prisma's AI-safety gate may ask for an explicit
  consent env var.
- **`pnpm` missing or wrong version** — `corepack enable` so the pinned pnpm 10
  is used.
- **Node version warning from Next** — switch to Node 20 or 22.

---

## See also

- `README.md` — repo overview + quick start
- `ARCHITECTURE.md` — API surface, auth, rate limits
- `DEPLOYMENT.md` / `DEPLOY_VERCEL_NEON.md` — production deploy (Vercel + Neon)
- `CLAUDE.md` / `GEMINI.md` — AI-assisted workflow conventions for this repo
