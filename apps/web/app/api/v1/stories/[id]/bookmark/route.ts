import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { handleError, NotFoundError, requireUser } from "@/lib/auth-guard";
import { enforce, getLimiter } from "@/lib/ratelimit";
import { rateLimitKey } from "@/lib/request";

export const runtime = "nodejs";

const limiter = () => getLimiter("engage", 60, "1 m");

async function loadStory(idOrSlug: string) {
  const story = await db.story.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      deletedAt: null,
      status: "published",
    },
    select: { id: true },
  });
  if (!story) throw new NotFoundError("Story not found.");
  return story;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const blocked = await enforce(limiter(), await rateLimitKey());
    if (blocked) return blocked;
    const { id } = await params;
    const story = await loadStory(id);

    // Idempotent: upsert ignores duplicates.
    await db.bookmark.upsert({
      where: { userId_storyId: { userId: user.id, storyId: story.id } },
      create: { userId: user.id, storyId: story.id },
      update: {},
    });
    return json({ bookmarked: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const blocked = await enforce(limiter(), await rateLimitKey());
    if (blocked) return blocked;
    const { id } = await params;
    const story = await loadStory(id);

    await db.bookmark
      .delete({
        where: { userId_storyId: { userId: user.id, storyId: story.id } },
      })
      .catch(() => {
        /* already absent — toggle is idempotent */
      });
    return json({ bookmarked: false });
  } catch (err) {
    return handleError(err);
  }
}
