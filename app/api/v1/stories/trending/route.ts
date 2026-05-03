import { z } from "zod";
import { db } from "@/lib/db";
import { json, zodError } from "@/lib/api";
import { handleError } from "@/lib/auth-guard";
import { serializeStory } from "@/lib/story";

export const runtime = "nodejs";

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return zodError(parsed.error);

    // V1 sorts by all-time view count. TODO (commit 8): once the View
    // table is being written for real, switch to a 7-day rolling count
    // (`COUNT(*) FROM views WHERE viewed_at >= NOW() - '7 days'`).
    const stories = await db.story.findMany({
      where: { status: "published", deletedAt: null },
      orderBy: [{ viewCount: "desc" }, { id: "desc" }],
      take: parsed.data.limit,
      include: { author: true },
    });

    return json({
      stories: stories.map((s) => serializeStory(s, s.author)),
    });
  } catch (err) {
    return handleError(err);
  }
}
