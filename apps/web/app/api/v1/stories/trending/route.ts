import { z } from "zod";
import type { Prisma, Story, User } from "@prisma/client";
import { db } from "@/lib/db";
import { json, zodError } from "@/lib/api";
import { handleError } from "@/lib/auth-guard";
import { serializeStory } from "@/lib/story";

export const runtime = "nodejs";

type StoryWithAuthor = Story & { author: User };

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return zodError(parsed.error);
    const limit = parsed.data.limit;

    // Rank stories by views in the last 7 days. Group on the views
    // table so a single popular day doesn't get drowned by the all-
    // time leaderboard. Stories without recent views just don't
    // appear in this list — and that's the desired "trending" shape.
    const since = new Date(Date.now() - SEVEN_DAYS_MS);
    const recent = await db.view.groupBy({
      by: ["storyId"],
      where: { viewedAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { storyId: "desc" } },
      take: limit,
    });

    let stories: StoryWithAuthor[];
    if (recent.length > 0) {
      const ids = recent.map((r) => r.storyId);
      const rows = await db.story.findMany({
        where: { id: { in: ids }, status: "published", deletedAt: null },
        include: { author: true },
      });
      // Re-order to match the recent-views ranking, dropping anything
      // that's been unpublished or soft-deleted since.
      const byId = new Map<string, StoryWithAuthor>(
        rows.map((s) => [s.id, s]),
      );
      stories = ids
        .map((id) => byId.get(id))
        .filter((s): s is StoryWithAuthor => !!s);
    } else {
      stories = [];
    }

    // Fall back to all-time view count for any remaining slots so the
    // endpoint is still useful on a fresh seed (where the views table
    // is empty). Excludes stories already returned above.
    if (stories.length < limit) {
      const exclude = stories.map((s) => s.id);
      const fillers = await db.story.findMany({
        where: {
          status: "published",
          deletedAt: null,
          ...(exclude.length > 0
            ? { id: { notIn: exclude } satisfies Prisma.StringFilter<"Story"> }
            : {}),
        },
        orderBy: [{ viewCount: "desc" }, { id: "desc" }],
        take: limit - stories.length,
        include: { author: true },
      });
      stories = [...stories, ...fillers];
    }

    return json({
      stories: stories.map((s) => serializeStory(s, s.author)),
    });
  } catch (err) {
    return handleError(err);
  }
}
