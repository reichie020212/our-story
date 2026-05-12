-- Email verification: gate sign-in behind a one-time emailed token.
--
--   • users.email_verified_at: null until the user clicks the link.
--     Existing rows are grandfathered with NOW() so dev users that
--     were created pre-verification can still sign in.
--   • email_verification_tokens: opaque random token, sha256-hashed
--     at rest. Single-use (consumedAt marks success). Cascade-delete
--     with the user.
--
-- OAuth signups set email_verified_at at create time; only password
-- signups go through the token flow.

ALTER TABLE "users"
  ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Backfill existing users so the new sign-in gate doesn't lock anyone
-- out. Anyone created after this migration goes through the proper
-- flow. There are no prod users at the time of this migration; dev
-- branches may have ad-hoc accounts seeded for testing.
UPDATE "users" SET "email_verified_at" = NOW() WHERE "email_verified_at" IS NULL;

CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key"
  ON "email_verification_tokens" ("token_hash");

CREATE INDEX "email_verification_tokens_user_id_idx"
  ON "email_verification_tokens" ("user_id");

ALTER TABLE "email_verification_tokens"
  ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
