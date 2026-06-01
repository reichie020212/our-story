import type { Story } from "@prisma/client";
import type { StoryAuthor, StoryWire } from "@our-story/api-types";

// Re-export the wire-format types so callers in this app keep their
// existing import path (`@/lib/story`) but the source of truth is the
// shared @our-story/api-types package.
export type { StoryAuthor, StoryWire };
export type StoryAuthorSlice = StoryAuthor;

const WORDS_PER_MINUTE = 220;

export function paragraphsFromBody(body: unknown): string[] {
  if (!Array.isArray(body)) return [];
  return body.filter((p): p is string => typeof p === "string");
}

export function minutesFromBody(body: unknown): number {
  const text = paragraphsFromBody(body).join(" ").trim();
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Shape a Story row + author for the JSON wire. Internal-only fields
 *  (deletedAt, raw author email) never leak. */
export function serializeStory(
  story: Story,
  author: StoryAuthor,
  viewerState?: { liked?: boolean; bookmarked?: boolean },
): StoryWire {
  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    synopsis: story.synopsis,
    body: paragraphsFromBody(story.body),
    genre: story.genre,
    length: story.length,
    tags: story.tags,
    status: story.status,
    featured: story.featured,
    publishedAt: story.publishedAt?.toISOString() ?? null,
    minutes: story.minutes,
    views: story.viewCount,
    likes: story.likeCount,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
    submittedForReviewAt: story.submittedForReviewAt?.toISOString() ?? null,
    reviewedAt: story.reviewedAt?.toISOString() ?? null,
    rejectionReason: story.rejectionReason ?? null,
    author: {
      id: author.id,
      name: author.name,
      handle: author.handle,
      initial: author.initial,
    },
    ...(viewerState?.liked !== undefined ? { liked: viewerState.liked } : {}),
    ...(viewerState?.bookmarked !== undefined
      ? { bookmarked: viewerState.bookmarked }
      : {}),
  };
}
