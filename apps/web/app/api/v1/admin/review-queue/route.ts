import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { handleError, requireAdmin } from "@/lib/auth-guard";
import { serializeStory } from "@/lib/story";

export const runtime = "nodejs";

/** Admin review queue: stories awaiting approval, oldest submission first. */
export async function GET() {
  try {
    await requireAdmin();
    const stories = await db.story.findMany({
      where: { status: "pending_review", deletedAt: null },
      orderBy: { submittedForReviewAt: "asc" },
      include: { author: true },
    });
    return json({
      stories: stories.map((s) => serializeStory(s, s.author)),
    });
  } catch (err) {
    return handleError(err);
  }
}
