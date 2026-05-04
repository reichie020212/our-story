import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { handleError, requireUser } from "@/lib/auth-guard";
import { serializeStory } from "@/lib/story";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.bookmark.findMany({
      where: { userId: user.id, story: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      include: { story: { include: { author: true } } },
    });
    return json({
      stories: rows.map((r) => serializeStory(r.story, r.story.author)),
    });
  } catch (err) {
    return handleError(err);
  }
}
