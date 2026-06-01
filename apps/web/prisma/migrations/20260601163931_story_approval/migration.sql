-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- AlterEnum
-- Two new StoryStatus values for the approval workflow. IF NOT EXISTS so a
-- partially-applied retry is safe. Not used as data in this migration, so
-- adding them in this transaction is fine on PG12+.
ALTER TYPE "StoryStatus" ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE "StoryStatus" ADD VALUE IF NOT EXISTS 'rejected';

-- AlterTable
-- NOTE: Prisma's auto-generated diff also wanted to DROP the
-- `stories_search_vector_idx` GIN index and `ALTER COLUMN search_vector
-- DROP DEFAULT`. Both are bogus — `search_vector` is a STORED GENERATED
-- tsvector column (typed Unsupported in the schema) with a hand-rolled GIN
-- index from migration 0004 that Prisma can't model. Those statements were
-- removed by hand; the FTS column and its index are left intact.
ALTER TABLE "stories" ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_id" TEXT,
ADD COLUMN     "submitted_for_review_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stories_status_submitted_for_review_at_idx" ON "stories"("status", "submitted_for_review_at");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
