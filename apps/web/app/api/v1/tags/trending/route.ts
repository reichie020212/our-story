import { z } from "zod";
import { db } from "@/lib/db";
import { json, zodError } from "@/lib/api";
import { handleError } from "@/lib/auth-guard";

export const runtime = "nodejs";

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = Query.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) return zodError(parsed.error);

    // Pull tag arrays from published, non-deleted stories and tally them
    // in JS. For v1 (~10–10k stories) this is fine; once the library
    // outgrows that, swap for `unnest(tags)` + GROUP BY in raw SQL.
    const rows = await db.story.findMany({
      where: { status: "published", deletedAt: null },
      select: { tags: true },
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const tag of row.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, parsed.data.limit)
      .map(([tag, count]) => ({ tag, count }));

    return json({ tags: sorted });
  } catch (err) {
    return handleError(err);
  }
}
