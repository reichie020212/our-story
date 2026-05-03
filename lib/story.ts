import type { Story, User } from "@prisma/client";

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

export type StoryAuthorSlice = Pick<
  User,
  "id" | "name" | "handle" | "initial"
>;

export type StoryWire = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  body: string[];
  genre: Story["genre"];
  length: Story["length"];
  tags: string[];
  status: Story["status"];
  featured: boolean;
  publishedAt: string | null;
  minutes: number;
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    handle: string;
    initial: string;
  };
};

/** Shape a Story row + author for the JSON wire. Internal-only fields
 *  (deletedAt, raw author email) never leak. */
export function serializeStory(
  story: Story,
  author: StoryAuthorSlice,
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
    author: {
      id: author.id,
      name: author.name,
      handle: author.handle,
      initial: author.initial,
    },
  };
}
