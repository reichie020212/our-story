/**
 * Shared query fetchers + key factory. Queries live close to the
 * screens that use them; this module just centralizes the URL paths
 * and Zod parsing so a server contract change surfaces in exactly
 * one place.
 */
import {
  BookmarkResponseSchema,
  LikeResponseSchema,
  StoryListNoCursorResponseSchema,
  StoryListResponseSchema,
  StoryResponseSchema,
  TrendingTagsResponseSchema,
  type BookmarkResponse,
  type LikeResponse,
  type StoryListResponse,
  type StoryWire,
  type TrendingTagsResponse,
} from "@our-story/api-types";
import { apiFetch } from "./api";

export const queryKeys = {
  stories: (params: { q?: string }) =>
    ["stories", { q: params.q ?? null }] as const,
  story: (idOrSlug: string) => ["story", idOrSlug] as const,
  bookmarks: () => ["bookmarks"] as const,
  featured: () => ["featured"] as const,
  myStories: () => ["me", "stories"] as const,
  trendingTags: () => ["tags", "trending"] as const,
} as const;

export async function fetchStoriesPage(args: {
  cursor?: string;
  limit?: number;
  q?: string;
  tag?: string;
}): Promise<StoryListResponse> {
  const params = new URLSearchParams();
  if (args.cursor) params.set("cursor", args.cursor);
  if (args.limit) params.set("limit", String(args.limit));
  if (args.q) params.set("q", args.q);
  if (args.tag) params.set("tag", args.tag);
  const qs = params.toString();
  const path = `/api/v1/stories${qs ? `?${qs}` : ""}`;
  const body = await apiFetch<unknown>(path);
  return StoryListResponseSchema.parse(body);
}

export async function fetchStory(idOrSlug: string): Promise<StoryWire> {
  const body = await apiFetch<unknown>(
    `/api/v1/stories/${encodeURIComponent(idOrSlug)}`,
  );
  return StoryResponseSchema.parse(body).story;
}

export async function fetchFeatured(): Promise<StoryWire | null> {
  try {
    const body = await apiFetch<unknown>("/api/v1/stories/featured");
    return StoryResponseSchema.parse(body).story;
  } catch (err) {
    // 404 "no_featured" means there's currently no featured story —
    // a normal state, not an error. Anything else propagates.
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      (err as { status: number }).status === 404
    ) {
      return null;
    }
    throw err;
  }
}

export async function fetchBookmarks(): Promise<StoryWire[]> {
  const body = await apiFetch<unknown>("/api/v1/me/bookmarks");
  return StoryListNoCursorResponseSchema.parse(body).stories;
}

export async function fetchMyStories(): Promise<StoryWire[]> {
  const body = await apiFetch<unknown>("/api/v1/me/stories");
  return StoryListNoCursorResponseSchema.parse(body).stories;
}

export async function fetchTrendingTags(): Promise<TrendingTagsResponse["tags"]> {
  const body = await apiFetch<unknown>("/api/v1/tags/trending");
  return TrendingTagsResponseSchema.parse(body).tags;
}

export async function toggleLike(
  idOrSlug: string,
  next: boolean,
): Promise<LikeResponse> {
  const body = await apiFetch<unknown>(
    `/api/v1/stories/${encodeURIComponent(idOrSlug)}/like`,
    { method: next ? "POST" : "DELETE" },
  );
  return LikeResponseSchema.parse(body);
}

export async function toggleBookmark(
  idOrSlug: string,
  next: boolean,
): Promise<BookmarkResponse> {
  const body = await apiFetch<unknown>(
    `/api/v1/stories/${encodeURIComponent(idOrSlug)}/bookmark`,
    { method: next ? "POST" : "DELETE" },
  );
  return BookmarkResponseSchema.parse(body);
}
