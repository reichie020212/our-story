-- Replace the ILIKE-based search on /api/v1/stories with proper
-- Postgres full-text search:
--
--   • search_vector is a STORED generated column. Postgres maintains
--     it on every INSERT/UPDATE — no app-side trigger or backfill.
--   • Weights: title = A, synopsis = B, tags = C. Author name is NOT
--     in the vector (it lives on a different table); the list handler
--     keeps an OR'd ILIKE join for that.
--   • 'english' config gives stemming + stopwords (so "stories"
--     matches "story", "running" matches "ran").
--
-- The expression is wrapped in an IMMUTABLE SQL function because
-- Postgres won't accept a generated column whose expression isn't
-- provably immutable, and to_tsvector(text, text) isn't (going from
-- the literal 'english' to a regconfig goes through a STABLE cast).
-- Wrapping with explicit regconfig + IMMUTABLE marker sidesteps that.
--
-- The GIN index is created non-concurrently because Prisma migrate
-- runs migrations inside a transaction. Acceptable for the current
-- scale; rebuild CONCURRENTLY as a separate ops step if/when the
-- table outgrows that.

CREATE FUNCTION "story_search_vector"(title text, synopsis text, tags text[])
RETURNS tsvector
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(synopsis, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(array_to_string(tags, ' '), '')), 'C');
$$;

ALTER TABLE "stories" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS ("story_search_vector"("title", "synopsis", "tags")) STORED;

CREATE INDEX "stories_search_vector_idx" ON "stories" USING GIN ("search_vector");
