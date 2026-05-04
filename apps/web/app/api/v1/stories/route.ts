import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { error, json, zodError } from "@/lib/api";
import { handleError, requireUser } from "@/lib/auth-guard";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { uniqueStorySlug } from "@/lib/slug";
import { minutesFromBody, serializeStory } from "@/lib/story";

export const runtime = "nodejs";

const writeLimiter = () => getLimiter("write", 10, "1 m");

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

/** Full-text search path. Used when `q` is set; ignores `sort` because
 *  relevance wins (mixing ts_rank with popularity gets messy). Cursor
 *  is an offset string here, not a story id — callers just round-trip
 *  whatever nextCursor we returned, so the format change is invisible. */
async function listBySearch(args: {
  q: string;
  genre?: (typeof GENRES)[number];
  length?: (typeof LENGTHS)[number];
  tag?: string;
  limit: number;
  cursor?: string;
}) {
  const { q, genre, length, tag, limit, cursor } = args;
  const offset = cursor ? Math.max(0, parseInt(cursor, 10) || 0) : 0;
  const likeQ = `%${q}%`;

  const filters: Prisma.Sql[] = [
    Prisma.sql`s.status = 'published'::"StoryStatus"`,
    Prisma.sql`s.deleted_at IS NULL`,
    Prisma.sql`(s.search_vector @@ websearch_to_tsquery('english'::regconfig, ${q}) OR u.name ILIKE ${likeQ})`,
  ];
  if (genre) filters.push(Prisma.sql`s.genre = ${genre}::"Genre"`);
  if (length) filters.push(Prisma.sql`s.length = ${length}::"StoryLength"`);
  if (tag) filters.push(Prisma.sql`${tag} = ANY(s.tags)`);

  const rows = await db.$queryRaw<{ id: string; rank: number }[]>`
    SELECT s.id,
           ts_rank(s.search_vector, websearch_to_tsquery('english'::regconfig, ${q})) AS rank
    FROM stories s
    LEFT JOIN users u ON s.author_id = u.id
    WHERE ${Prisma.join(filters, " AND ")}
    ORDER BY rank DESC, s.published_at DESC NULLS LAST, s.id DESC
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `;

  if (rows.length === 0) return json({ stories: [], nextCursor: null });

  // Hydrate via Prisma so we get the same author shape and serializer
  // path as the non-search list. The findMany doesn't preserve our rank
  // order, so re-sort using the row order from the raw query.
  const hydrated = await db.story.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { author: true },
  });
  const order = new Map(rows.map((r, i) => [r.id, i] as const));
  hydrated.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  const hasMore = hydrated.length > limit;
  const page = hasMore ? hydrated.slice(0, limit) : hydrated;
  const nextCursor = hasMore ? String(offset + page.length) : null;

  return json({
    stories: page.map((s) => serializeStory(s, s.author)),
    nextCursor,
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = ListQuery.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return zodError(parsed.error);
    const { genre, length, tag, q, sort, limit, cursor } = parsed.data;

    if (q) return await listBySearch({ q, genre, length, tag, limit, cursor });

    const where: Prisma.StoryWhereInput = {
      status: "published",
      deletedAt: null,
    };
    if (genre) where.genre = genre;
    if (length) where.length = length;
    if (tag) where.tags = { has: tag };

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
    const blocked = await enforce(writeLimiter(), `u:${user.id}`);
    if (blocked) return blocked;
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
