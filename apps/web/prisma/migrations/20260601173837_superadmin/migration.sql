-- Add the superadmin flag. (Prisma's auto-diff also wanted to drop the
-- stories_search_vector_idx GIN index + the search_vector generated column's
-- "default" — both bogus, since that column/index are hand-managed raw SQL
-- from migration 0004 that Prisma can't model. Removed by hand.)
ALTER TABLE "users" ADD COLUMN "is_superadmin" BOOLEAN NOT NULL DEFAULT false;
