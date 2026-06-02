# Deployment

Vercel + Neon, hobby tier. This is a checklist for the first deploy of `apps/web`. The mobile client (`apps/mobile`) doesn't deploy here — it's an Expo project; ship via EAS Build / TestFlight / Play Console when its time comes.

## 0. Pre-flight

- The branch you want to deploy is on a GitHub remote and pushed.
- You have admin access to the Neon project and a Vercel account.
- You've decided whether the Neon database backing prod is a fresh project or the existing dev database. The smoke-tested setup currently has `mara@ourstory.test` and 10 seed stories in it — fine to keep for v1, fork later.

## 1. Vercel project setup

1. Vercel dashboard → **Add New Project** → import the GitHub repo.
2. **Framework Preset**: Next.js (auto-detected).
3. **Root Directory**: `apps/web` ← critical. Vercel auto-detects the pnpm workspace root above it.
4. **Build Command**: leave as default. The `vercel-build` script in `apps/web/package.json` (`prisma migrate deploy && tsx scripts/ensure-superadmin.ts && next build`) runs automatically — migrate, bootstrap the superadmin, build.
5. **Install Command**: leave as default (`pnpm install` — Vercel detects the workspace via `packageManager` in the root `package.json`).
6. **Output Directory**: leave as default (`.next`).
7. **Node version**: 20 or 22 (engine constraint in root `package.json` is `>=20`).

## 2. Environment variables

Set under **Settings → Environment Variables**. Apply to **Production** + **Preview** unless noted. For exactly where each value comes from, see `DEPLOY_VERCEL_NEON.md` §4.

**Required:**

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string | runtime queries use the pgbouncer pool |
| `DATABASE_URL_DIRECT` | Neon **unpooled** connection string | `prisma migrate deploy` needs a direct connection |
| `JWT_PRIVATE_KEY` | RSA-2048 PEM, multi-line | Vercel UI accepts multi-line values; paste as-is |
| `JWT_PUBLIC_KEY` | matching PEM | same |
| `NEXT_PUBLIC_SITE_URL` | the Vercel production URL (e.g. `https://ourstory.vercel.app`) | OAuth callbacks + absolute links — **no trailing slash** |

**Recommended — bootstraps the one admin** (`vercel-build` runs `ensure-superadmin.ts`; blank ⇒ no admin is created):

| Variable | Value | Notes |
|---|---|---|
| `SUPERADMIN_EMAIL` | you choose | login for the single, undemotable superadmin |
| `SUPERADMIN_PASSWORD` | you choose (strong) | re-applied each deploy — rotate here, then redeploy |
| `SUPERADMIN_NAME` | you choose | display name; defaults to `Superadmin` |

**Optional** (app degrades gracefully when blank):

| Variable | Value / where | Notes |
|---|---|---|
| `NEXT_PUBLIC_ADS_ENABLED` | leave blank | ad placeholders stay hidden unless exactly `"true"` (needs Vercel Pro) |
| `RESEND_API_KEY` | resend.com → API Keys | production email; blank ⇒ verification links logged to Vercel logs |
| `RESEND_FROM` | verified Resend sender, `OurStory <noreply@domain>` | required only if `RESEND_API_KEY` is set |
| `UPSTASH_REDIS_REST_URL` | Upstash → Redis → REST API | rate limiter no-ops gracefully when blank |
| `UPSTASH_REDIS_REST_TOKEN` | same | pair with the URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud → Credentials | OAuth start route 503s when blank |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | github.com/settings/developers | same |

> **Don't set `SMTP_*` in Vercel.** Those vars are for local dev only (Mailpit / Mailtrap) and take priority over Resend, so a stray `SMTP_HOST` would misroute production mail. Use `RESEND_*` in production.

If you're moving the dev `.env` to prod verbatim: rotate `JWT_PRIVATE_KEY` first. The pair currently in the dev `.env` was generated as a smoke-test throwaway and is fine for dev but should not become the production signing key.

## 3. OAuth callback URLs

After the first deploy, register the production callbacks with each provider:

- Google: `${NEXT_PUBLIC_SITE_URL}/api/v1/auth/oauth/google/callback`
- GitHub: `${NEXT_PUBLIC_SITE_URL}/api/v1/auth/oauth/github/callback`

Skip until OAuth env vars are set.

## 4. First deploy

1. Push to the branch Vercel watches.
2. Watch the build logs: `prisma migrate deploy` applies all migrations to the prod database, then `ensure-superadmin.ts` creates the superadmin from `SUPERADMIN_*`, then Next builds.
3. Visit `${NEXT_PUBLIC_SITE_URL}` — should render Browse with the seed stories.
4. Spot-check `${NEXT_PUBLIC_SITE_URL}/api/v1/stories?q=trains` — should return the stemmed FTS match.
5. Sign in as `SUPERADMIN_EMAIL` — the **Admin** menu (approval toggle, review queue, user management) should appear. Missing ⇒ `SUPERADMIN_*` were blank at build; set them and redeploy.

## 5. Wire mobile to prod

In `apps/mobile`, set `EXPO_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_SITE_URL}` (no trailing slash) before `pnpm mobile start` to test against prod. For EAS Build profiles, set this in `eas.json` env per build profile (dev / preview / production).

## 6. Operational notes

- **Migrations**: `vercel-build` applies them as part of every deploy. Idempotent (Prisma tracks applied migrations) so redeploys are safe.
- **Superadmin**: `vercel-build` also runs `ensure-superadmin.ts`, upserting the single superadmin from `SUPERADMIN_*` (idempotent). Rotate by changing `SUPERADMIN_PASSWORD` and redeploying.
- **Concurrent index creation**: future migrations that need `CREATE INDEX CONCURRENTLY` won't fit Prisma's transaction-wrapped migrate. Run those out-of-band against `DATABASE_URL_DIRECT` and mark the migration `--applied` afterward.
- **Cost**: Vercel Hobby + Neon Hobby + Upstash free = ~$0/mo at low traffic. If/when ads land, Vercel ToS requires Pro ($20/mo); Neon usage usually stays under the free tier far longer.
- **Rollback**: `vercel rollback` reverts the deployment. Migrations don't auto-rollback — write down-migrations only when truly needed; usually forward-only is fine.
