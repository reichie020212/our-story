-- Soft-delete column for stories. Public lists filter `deleted_at IS NULL`;
-- the row stays so existing likes/bookmarks/views remain referentially
-- valid until a periodic GC purges old soft-deleted stories.
ALTER TABLE "stories" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "stories_deleted_at_idx" ON "stories"("deleted_at");
