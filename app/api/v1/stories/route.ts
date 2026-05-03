import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import { handleError, requireUser } from "@/lib/auth-guard";
import { uniqueStorySlug } from "@/lib/slug";
import { minutesFromBody, serializeStory } from "@/lib/story";

export const runtime = "nodejs";

const GENRES = [
  "literary",
  "fantasy",
  "scifi",
  "romance",
  "horror",
  "mystery",
  "memoir",
  "poetry",
] as const;
const LENGTHS = ["flash", "short", "novelette", "novella"] as const;
const SORTS = ["recent", "popular", "loved", "shortest"] as const;

const ListQuery = z.object({
  genre: z.enum(GENRES).optional(),
  length: z.enum(LENGTHS).optional(),
  tag: z.string().trim().min(1).max(30).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(SORTS).optional().default("recent"),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().min(1).optional(),
});

const SORT_ORDERS: Record<
  (typeof SORTS)[number],
  Prisma.StoryOrderByWithRelationInput[]
> = {
  // The secondary `id desc` keeps cursor pagination stable when the
  // primary key has ties (e.g. several stories published the same day).
  recent: [{ publishedAt: "desc" }, { id: "desc" }],
  popular: [{ viewCount: "desc" }, { id: "desc" }],
  loved: [{ likeCount: "desc" }, { id: "desc" }],
  shortest: [{ minutes: "asc" }, { id: "desc" }],
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = ListQuery.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return zodError(parsed.error);
    const { genre, length, tag, q, sort, limit, cursor } = parsed.data;

    const where: Prisma.StoryWhereInput = {
      status: "published",
      deletedAt: null,
    };
    if (genre) where.genre = genre;
    if (length) where.length = length;
    if (tag) where.tags = { has: tag };
    if (q) {
      // ILIKE search on title / synopsis / tags / author name. TODO:
      // swap for a tsvector + GIN index once we have enough stories
      // for ILIKE to feel slow (memory: backend decisions doc).
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { synopsis: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
        { author: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const stories = await db.story.findMany({
      where,
      orderBy: SORT_ORDERS[sort],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { author: true },
    });

    const hasMore = stories.length > limit;
    const page = hasMore ? stories.slice(0, limit) : stories;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return json({
      stories: page.map((s) => serializeStory(s, s.author)),
      nextCursor,
    });
  } catch (err) {
    return handleError(err);
  }
}

const CreateBody = z.object({
  title: z.string().trim().min(1).max(200),
  synopsis: z.string().trim().max(500).optional().default(""),
  body: z
    .array(z.string().max(2000))
    .max(30, "A draft can have at most 30 paragraphs.")
    .optional()
    .default([]),
  genre: z.enum(GENRES).optional().default("literary"),
  length: z.enum(LENGTHS).optional().default("flash"),
  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10)
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return error(400, "invalid_json", "Request body must be valid JSON.");
    }
    const parsed = CreateBody.safeParse(raw);
    if (!parsed.success) return zodError(parsed.error);
    const data = parsed.data;

    const slug = await uniqueStorySlug(data.title);
    const cleanedTags = Array.from(
      new Set(data.tags.map((t) => t.toLowerCase().replace(/\s+/g, "-"))),
    );

    const story = await db.story.create({
      data: {
        slug,
        authorId: user.id,
        title: data.title,
        synopsis: data.synopsis,
        body: data.body,
        genre: data.genre,
        length: data.length,
        tags: cleanedTags,
        status: "draft",
        featured: false,
        minutes: minutesFromBody(data.body),
      },
    });

    return json(
      {
        story: serializeStory(story, {
          id: user.id,
          name: user.name,
          handle: user.handle,
          initial: user.initial,
        }),
      },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}
