import { db } from "@/lib/db";
import { error, json } from "@/lib/api";
import { handleError } from "@/lib/auth-guard";
import { serializeStory } from "@/lib/story";

export const runtime = "nodejs";

export async function GET() {
  try {
    const story = await db.story.findFirst({
      where: { featured: true, status: "published", deletedAt: null },
      orderBy: { publishedAt: "desc" },
      include: { author: true },
    });
    if (!story) {
      return error(
        404,
        "no_featured",
        "No story is currently featured.",
      );
    }
    return json({ story: serializeStory(story, story.author) });
  } catch (err) {
    return handleError(err);
  }
}
