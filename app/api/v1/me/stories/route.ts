import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { handleError, requireUser } from "@/lib/auth-guard";
import { serializeStory } from "@/lib/story";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();

    const stories = await db.story.findMany({
      where: { authorId: user.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      include: { author: true },
    });

    return json({
      stories: stories.map((s) => serializeStory(s, s.author)),
    });
  } catch (err) {
    return handleError(err);
  }
}
