-- Mobile refresh tokens. The token itself is opaque (32 bytes,
-- base64url-encoded) and never stored — only the sha256 of it lives
-- in `token_hash`, so a snapshot of this table can't be replayed.
CREATE TABLE "mobile_refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_refresh_tokens_token_hash_key"
    ON "mobile_refresh_tokens"("token_hash");

CREATE INDEX "mobile_refresh_tokens_user_id_idx"
    ON "mobile_refresh_tokens"("user_id");

ALTER TABLE "mobile_refresh_tokens"
    ADD CONSTRAINT "mobile_refresh_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
