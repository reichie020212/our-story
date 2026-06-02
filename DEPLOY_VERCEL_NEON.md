# Deploying OurStory to Vercel + Neon (Hobby)

A step-by-step guide for putting the **web app** (`apps/web`) live on the free
**Vercel Hobby** + **Neon Hobby** tiers. Written to be followed top-to-bottom on
a first deploy.

> The mobile client (`apps/mobile`) does **not** deploy here — it's an Expo
> project shipped later via EAS Build / TestFlight / Play Console. This guide is
> web-only. See [§9](#9-point-the-mobile-app-at-production-later) for how mobile
> connects to the deployed API.

> `DEPLOYMENT.md` in this repo is the terse checklist version of the same
> process. This file is the long-form walkthrough — use whichever suits you.

---

## What you're deploying

| Piece | Hosted on | Tier | Cost |
|---|---|---|---|
| Next.js 15 web app + `/api/v1/*` | Vercel | Hobby | $0 |
| Postgres database | Neon | Hobby (free) | $0 |
| Rate limiter (optional) | Upstash Redis | Free | $0 |
| Transactional email (optional) | Resend | Free | $0 |

**Total: ~$0/mo** at low traffic, ads off.

> ⚠️ **One cost caveat:** Vercel's Hobby plan does **not** allow commercial /
> ad-supported sites. Ads are gated off in production by default (see
> [§7](#7-a-note-on-ads-and-vercels-hobby-terms)), so Hobby is fine for launch.
> The day you turn ads on, you must move to **Vercel Pro ($20/mo)** to stay
> within their terms.

---

## 0. Before you start

You'll need:

- [ ] The repo pushed to a **GitHub** remote (Vercel deploys from GitHub).
- [ ] A **GitHub account** (you'll sign into Vercel with it).
- [ ] A **Neon account** — sign up free at <https://neon.tech>.
- [ ] A **Vercel account** — sign up free at <https://vercel.com>.
- [ ] `openssl` available locally (it ships with macOS/Linux) for generating the
      JWT signing keys in [§2](#2-generate-the-jwt-signing-keypair).

Decide one thing up front: **which database backs production.** For v1 it's
fine to create a fresh Neon project (recommended — clean prod data). You can
seed it with the demo content during the build, or start empty.

---

## 1. Create the Neon database

1. Log in to <https://console.neon.tech> → **New Project**.
2. Name it (e.g. `ourstory-prod`), pick a region close to your Vercel region
   (or your users), and choose the latest Postgres version.
3. Once created, open **Connection Details**. Neon gives you a connection
   string. You need **two forms** of it:

   - **Pooled** — the one with **`-pooler`** in the hostname. This is for
     runtime queries (it goes through Neon's pgbouncer pool).
     → this becomes `DATABASE_URL`
   - **Direct / unpooled** — the same string **without** `-pooler` in the
     hostname. Prisma's migrations need a direct connection.
     → this becomes `DATABASE_URL_DIRECT`

   In the Neon UI there's usually a **"Pooled connection"** toggle — copy the
   string with it **on** for `DATABASE_URL`, and with it **off** for
   `DATABASE_URL_DIRECT`. Both must end with `?sslmode=require`.

4. Keep both strings somewhere safe for [§4](#4-set-environment-variables-in-vercel).

Example shapes (yours will differ):

```
# Pooled  → DATABASE_URL
postgresql://user:pass@ep-cool-name-123456-pooler.us-east-1.aws.neon.tech/ourstory?sslmode=require

# Direct  → DATABASE_URL_DIRECT
postgresql://user:pass@ep-cool-name-123456.us-east-1.aws.neon.tech/ourstory?sslmode=require
```

---

## 2. Generate the JWT signing keypair

Mobile auth signs access tokens with **RS256**, which needs an RSA key pair.
The pair in your local dev `.env` is a smoke-test throwaway — **do not reuse it
in production.** Generate a fresh one:

```bash
# Run anywhere; these files are temporary scratch — don't commit them.
openssl genpkey -algorithm RSA -out prod-private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in prod-private.pem -pubout -out prod-public.pem
```

You now have:

- `prod-private.pem` → the value for `JWT_PRIVATE_KEY`
- `prod-public.pem` → the value for `JWT_PUBLIC_KEY`

You'll paste the **full multi-line PEM contents** (including the
`-----BEGIN ... -----` / `-----END ... -----` lines) into Vercel in the next
steps. Vercel's env var UI accepts multi-line values.

> 🔒 Delete the local `.pem` files after pasting them into Vercel, or store them
> in a password manager. Never commit them.

---

## 3. Create the Vercel project

1. Go to the Vercel dashboard → **Add New… → Project**.
2. **Import** your OurStory GitHub repo (authorize Vercel to access it if
   prompted).
3. Configure these settings on the import screen:

   | Setting | Value | Why |
   |---|---|---|
   | **Framework Preset** | Next.js | auto-detected |
   | **Root Directory** | `apps/web` | ⚠️ **critical** — this is a monorepo; the web app isn't at the repo root |
   | **Build Command** | *(leave default)* | the `vercel-build` script automatically runs `prisma migrate deploy`, bootstraps the superadmin, then `next build` |
   | **Install Command** | *(leave default)* | Vercel runs `pnpm install` — it detects pnpm via the `packageManager` field in the root `package.json` |
   | **Output Directory** | *(leave default `.next`)* | standard Next.js output |
   | **Node.js Version** | 20 or 22 | the repo requires `>=20` |

4. **Do not deploy yet** — first add the environment variables (next step). If
   Vercel forces a first deploy, that's OK; it'll fail or render without a DB,
   and you'll redeploy after adding env vars.

---

## 4. Set environment variables in Vercel

In the project: **Settings → Environment Variables**. Add each one below and
apply it to **Production** and **Preview** (so preview deployments work too).
The **Where to get the value** column tells you exactly where each one comes
from — some you copy from a dashboard, some you generate, some you choose
yourself.

### Required — the app won't run correctly without these

| Variable | Where to get the value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon console → your project → **Connection Details**: the **pooled** string (has `-pooler` in the host). See [§1](#1-create-the-neon-database). | Runtime queries (goes through Neon's pooler). |
| `DATABASE_URL_DIRECT` | Same Neon **Connection Details**, toggle pooling **off**: the **direct** string (no `-pooler`). | Used by `prisma migrate deploy` (migrations can't run through the pool). |
| `JWT_PRIVATE_KEY` | The full contents of `prod-private.pem` you generated in [§2](#2-generate-the-jwt-signing-keypair) — paste the whole multi-line PEM. | Signs mobile RS256 access tokens. |
| `JWT_PUBLIC_KEY` | The full contents of `prod-public.pem` from [§2](#2-generate-the-jwt-signing-keypair). | Verifies those tokens. |
| `NEXT_PUBLIC_SITE_URL` | **Your production URL.** After the first deploy, copy it from the Vercel project's **Settings → Domains** (e.g. `https://ourstory.vercel.app`), or use your custom domain. **No trailing slash.** | Inlined at build time → changing it needs a **redeploy**. Used for verification links + OAuth callbacks. |

### Strongly recommended — bootstrap the admin account

Without these, **no admin exists**, so nobody can toggle the approval gate,
review submitted stories, or manage users. On every deploy `vercel-build` runs
`scripts/ensure-superadmin.ts`, which creates/updates exactly **one** superadmin
from these values (idempotent; it logs a warning and does nothing if they're
blank).

| Variable | Where to get the value | Notes |
|---|---|---|
| `SUPERADMIN_EMAIL` | **You choose it** — the login email for the single superadmin. | Account is created email-verified, `role=admin`, and **undemotable**. |
| `SUPERADMIN_PASSWORD` | **You choose it** — use a strong password and store it in a password manager. | Re-applied on every deploy, so rotate it by changing this var (not in-app) and redeploying. |
| `SUPERADMIN_NAME` | **You choose it** — display name. Defaults to `Superadmin` if blank. | Cosmetic. |

### Optional — the app degrades gracefully when these are blank

| Variable | Where to get the value | Behaviour when blank |
|---|---|---|
| `NEXT_PUBLIC_ADS_ENABLED` | None — a feature flag you set yourself. | Leave **unset** to keep ad placeholders hidden (required on Hobby — see [§7](#7-a-note-on-ads-and-vercels-hobby-terms)). Set to exactly `"true"` only with real ads + Vercel Pro. |
| `RESEND_API_KEY` | <https://resend.com> → **API Keys** → *Create API Key*. | Production email sender. When blank, the app **logs verification links to the Vercel runtime logs** instead of emailing — fine for a soft launch. |
| `RESEND_FROM` | A sender address at a domain you verified under Resend → **Domains**. Format: `OurStory <noreply@your-domain.com>`. | Required only if `RESEND_API_KEY` is set. |
| `UPSTASH_REDIS_REST_URL` | <https://console.upstash.com> → create a **Redis** database → **REST API** section → copy the REST URL. | Rate limiter no-ops (allows all requests) when blank. |
| `UPSTASH_REDIS_REST_TOKEN` | Same Upstash **REST API** section → copy the token. | Pair with the URL above. |
| `GOOGLE_CLIENT_ID` | <https://console.cloud.google.com> → **APIs & Services → Credentials → Create OAuth client ID** (type: Web application). | "Continue with Google" returns `503 oauth_not_configured`; password auth still works. |
| `GOOGLE_CLIENT_SECRET` | Shown alongside the client ID when you create the OAuth client. | Pair with the ID above. |
| `GITHUB_CLIENT_ID` | <https://github.com/settings/developers> → **OAuth Apps → New OAuth App**. | Same behaviour as Google. |
| `GITHUB_CLIENT_SECRET` | The same GitHub OAuth App → *Generate a new client secret*. | Pair with the ID above. |

> **Minimum to go live:** the five **Required** vars (and, in practice, the
> `SUPERADMIN_*` trio so you have an admin). Everything else can be added later
> by setting the var and redeploying.

### Email: local dev vs production

Email delivery picks its transport from the environment at send time
(`apps/web/lib/email.ts`):

1. `SMTP_HOST` set → send over **SMTP**
2. else `RESEND_API_KEY` + `RESEND_FROM` set → send via **Resend**
3. else → log the verification link to the server logs

**In production, use Resend** (set `RESEND_*`, above). **Do not set the `SMTP_*`
vars in Vercel** — `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_SECURE`, `SMTP_FROM` exist for **local dev only** (routing mail into a
[Mailpit](https://github.com/axllent/mailpit) container or a
[Mailtrap](https://mailtrap.io) sandbox inbox). Because SMTP takes priority over
Resend, a stray `SMTP_HOST` in Vercel would silently send production mail to the
wrong place. Leave them all blank in production.

---

## 5. First deploy

1. Trigger a deploy: either click **Deploy** in Vercel, or push a commit to the
   branch Vercel watches (usually `main`).
2. Watch the **build logs**. On this first build, `vercel-build` runs
   `prisma migrate deploy` (applies **all migrations** to your fresh Neon
   database), then `scripts/ensure-superadmin.ts` (creates the superadmin from
   your `SUPERADMIN_*` vars), then builds Next.js — all in one step.
3. Wait for the green **"Ready"** state.

If the build fails at the migration step, it's almost always a bad
`DATABASE_URL_DIRECT` (migrations need the **direct**, non-pooled string).
Double-check [§1](#1-create-the-neon-database).

---

## 6. Verify the deployment

Once live, smoke-test it:

1. **Homepage** — open `https://<your-site>/`. The Browse page should render.
   - If you seeded the DB, you'll see the demo stories. If you started empty,
     you'll see an empty library — that's expected.
2. **Search / FTS** — hit
   `https://<your-site>/api/v1/stories?q=trains`
   It should return JSON with a stemmed full-text match (proves Postgres + the
   FTS index deployed correctly).
3. **Auth** — sign up a new account, confirm you land signed-in. If `RESEND_*`
   is unset, check the Vercel **runtime logs** for the verification link.
4. **No stray ad boxes** — confirm the Browse page, a story reader, and the
   footer show **no** striped "AD" placeholders (proves `NEXT_PUBLIC_ADS_ENABLED`
   is correctly off in prod).
5. **Admin access** — sign in with the `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`
   you set. You should see the **Admin** menu (approval-gate toggle, review
   queue, user management). If it's missing, the `SUPERADMIN_*` vars were blank
   at build time — set them and redeploy.

### (Optional) Seed the production database

If you started empty and want the demo content, run the seed once against the
**direct** prod connection from your machine:

```bash
# From the repo root. Uses apps/web's seed script.
DATABASE_URL_DIRECT="<your Neon DIRECT string>" pnpm db:seed
```

The seed is idempotent and creates `mara@ourstory.test` / `password123` plus 10
stories. **Change or delete that demo account before any real launch.**

---

## 7. A note on ads and Vercel's Hobby terms

Vercel's **Hobby** plan is for non-commercial use and **prohibits running ads**.
This repo ships ad *placeholders* that are gated behind `NEXT_PUBLIC_ADS_ENABLED`
and render **nothing** unless that var equals `"true"`.

- **For launch (Hobby, free):** leave `NEXT_PUBLIC_ADS_ENABLED` unset. No ads
  render → compliant.
- **When you monetize:** upgrade to **Vercel Pro ($20/mo)**, wire in a real ad
  provider, then set `NEXT_PUBLIC_ADS_ENABLED=true` and redeploy.

> `NEXT_PUBLIC_*` vars are **inlined at build time**, not read at runtime.
> Changing this flag (or `NEXT_PUBLIC_SITE_URL`) in Vercel requires a
> **redeploy** to take effect.

---

## 8. OAuth callback URLs (only if you enabled OAuth)

If you set the Google/GitHub OAuth env vars, register the production callbacks
with each provider after the first deploy:

- **Google:** `${NEXT_PUBLIC_SITE_URL}/api/v1/auth/oauth/google/callback`
- **GitHub:** `${NEXT_PUBLIC_SITE_URL}/api/v1/auth/oauth/github/callback`

Use your real production URL in place of `${NEXT_PUBLIC_SITE_URL}`. Skip this
section entirely if you didn't configure OAuth.

---

## 9. Point the mobile app at production (later)

When you build the mobile client, tell it where the API lives:

- **Local test against prod:** in `apps/mobile`, set
  `EXPO_PUBLIC_API_BASE_URL=https://<your-site>` (no trailing slash) before
  `pnpm mobile start`.
- **EAS builds:** set `EXPO_PUBLIC_API_BASE_URL` per build profile (dev /
  preview / production) in `eas.json`.

---

## 10. Custom domain (optional)

1. Vercel project → **Settings → Domains → Add** your domain.
2. Follow Vercel's DNS instructions (either point your registrar's nameservers
   at Vercel, or add the CNAME/A records they show).
3. **Update `NEXT_PUBLIC_SITE_URL`** to the custom domain (no trailing slash)
   and **redeploy** so absolute links and OAuth callbacks use it.
4. If using OAuth, re-register the callback URLs ([§8](#8-oauth-callback-urls-only-if-you-enabled-oauth))
   with the new domain.

---

## 11. Operations & maintenance

- **Migrations on every deploy:** `vercel-build` runs `prisma migrate deploy`
  before each build. It's idempotent (Prisma tracks what's applied), so
  redeploys are safe.
- **Superadmin bootstrap on every deploy:** `vercel-build` also runs
  `scripts/ensure-superadmin.ts`, which upserts the single superadmin from the
  `SUPERADMIN_*` vars (idempotent). Rotate the password by changing
  `SUPERADMIN_PASSWORD` in Vercel and redeploying.
- **`CREATE INDEX CONCURRENTLY` migrations:** Prisma wraps migrations in a
  transaction, which conflicts with `CONCURRENTLY`. If a future migration needs
  it, run that statement out-of-band against `DATABASE_URL_DIRECT`, then mark
  the migration applied with `prisma migrate resolve --applied <name>`.
- **Rollback:** `vercel rollback` reverts to a previous deployment. Note that
  **database migrations do not auto-roll-back** — forward-only is usually fine;
  write a down-migration only when truly necessary.
- **Auto-deploys:** by default Vercel deploys every push to `main` (production)
  and every PR (a preview URL). You can change this under **Settings → Git**.
- **Logs:** **Vercel → your project → Logs** for runtime errors; the **Neon
  console** for DB metrics and query insights.
- **Cost watch:** Neon Hobby has compute/storage limits; you'll get dashboard
  warnings well before hitting them. Vercel Hobby has bandwidth/build limits
  that low-traffic sites rarely reach.

---

## Quick reference: pre-deploy gate

Before importing to Vercel (or before any production push), confirm the build
is green locally:

```bash
pnpm lint && pnpm typecheck && pnpm web test && pnpm build
```

If you touched the auth surface or any route handler, also run the integration
suite (needs `pnpm dev` running in another terminal):

```bash
pnpm web test:integration
```
