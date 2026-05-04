/**
 * Shared query fetchers + key factory. Queries live close to the
 * screens that use them; this module just centralizes the URL paths
 * and Zod parsing so a server contract change surfaces in exactly
 * one place.
 */
import {
  StoryListResponseSchema,
  StoryResponseSchema,
  type StoryListResponse,
  type StoryWire,
} from "@our-story/api-types";
import { apiFetch } from "./api";

export const queryKeys = {
  stories: (params: { q?: string }) =>
    ["stories", { q: params.q ?? null }] as const,
  story: (idOrSlug: string) => ["story", idOrSlug] as const,
  bookmarks: () => ["bookmarks"] as const,
} as const;

export async function fetchStoriesPage(args: {
  cursor?: string;
  limit?: number;
  q?: string;
}): Promise<StoryListResponse> {
  const params = new URLSearchParams();
  if (args.cursor) params.set("cursor", args.cursor);
  if (args.limit) params.set("limit", String(args.limit));
  if (args.q) params.set("q", args.q);
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
